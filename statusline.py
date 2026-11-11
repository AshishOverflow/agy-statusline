#!/usr/bin/env python3
"""
✦ Antigravity CLI Minimalistic Statusline (Python) ✦
Fast, zero-dependency statusline script for Google Antigravity CLI (agy).
"""

import sys
import os
import json
import subprocess
from pathlib import Path

# Colors support check
USE_COLORS = not os.environ.get("NO_COLOR") and (
    sys.stdout.isatty() or os.environ.get("TERM") != "dumb"
)


class C:
    RESET = "\033[0m" if USE_COLORS else ""
    BOLD = "\033[1m" if USE_COLORS else ""
    DIM = "\033[2m" if USE_COLORS else ""

    WHITE = "\033[38;2;241;245;249m" if USE_COLORS else ""
    MUTED = "\033[38;2;148;163;184m" if USE_COLORS else ""
    DIVIDER = "\033[38;2;71;85;105m" if USE_COLORS else ""

    IDLE = "\033[38;2;52;211;153m" if USE_COLORS else ""
    THINKING = "\033[38;2;251;191;36m" if USE_COLORS else ""
    WORKING = "\033[38;2;96;165;250m" if USE_COLORS else ""
    TOOL = "\033[38;2;192;132;252m" if USE_COLORS else ""
    ERROR = "\033[38;2;248;113;113m" if USE_COLORS else ""

    MODEL = "\033[38;2;167;139;250m" if USE_COLORS else ""
    EFFORT = "\033[38;2;56;189;248m" if USE_COLORS else ""
    GIT = "\033[38;2;251;191;36m" if USE_COLORS else ""
    CTX_NORMAL = "\033[38;2;45;212;191m" if USE_COLORS else ""
    CTX_WARN = "\033[38;2;251;191;36m" if USE_COLORS else ""
    CTX_ALERT = "\033[38;2;248;113;113m" if USE_COLORS else ""

    BG_STATE = "\033[48;2;15;23;42m" if USE_COLORS else ""
    BG_MODEL = "\033[48;2;30;27;75m" if USE_COLORS else ""
    BG_CTX = "\033[48;2;19;42;42m" if USE_COLORS else ""
    BG_GIT = "\033[48;2;42;36;22m" if USE_COLORS else ""


DEFAULT_CONFIG = {
    "preset": "minimal",
    "show_state": True,
    "show_model": True,
    "show_effort": True,
    "show_context": True,
    "show_git": True,
    "show_workspace": False,
    "show_tokens": False,
    "show_tasks": True,
    "nerd_fonts": False,
    "separator": "│",
}


def load_config():
    config = dict(DEFAULT_CONFIG)
    paths = [
        Path(__file__).parent / "statusline.json",
        Path.home() / ".gemini" / "antigravity-cli" / "statusline.json",
    ]
    for p in paths:
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    config.update(json.load(f))
                break
            except Exception:
                pass

    for arg in sys.argv[1:]:
        if arg.startswith("--preset="):
            config["preset"] = arg.split("=")[1]
        elif arg in ("--nerd-fonts", "--nerd"):
            config["nerd_fonts"] = True
        elif arg == "--tokens":
            config["show_tokens"] = True
        elif arg == "--workspace":
            config["show_workspace"] = True
        elif arg == "--no-git":
            config["show_git"] = False

    return config


def format_tokens(n):
    if n is None:
        return "0"
    if n >= 1_000_000:
        return f"{n / 1_000_000:.1f}".rstrip("0").rstrip(".") + "M"
    if n >= 1_000:
        return f"{n / 1_000:.1f}".rstrip("0").rstrip(".") + "k"
    return str(n)


def get_git_info(payload, cwd):
    if payload and payload.get("vcs", {}).get("branch"):
        return payload["vcs"]["branch"], bool(payload["vcs"].get("dirty"))

    target_dir = cwd or (payload.get("cwd") if payload else None) or os.getcwd()
    try:
        res = subprocess.run(
            ["git", "branch", "--show-current"],
            cwd=target_dir,
            capture_output=True,
            text=True,
            timeout=0.25,
        )
        branch = res.stdout.strip()
        if not branch:
            return None, False

        dirty_res = subprocess.run(
            ["git", "status", "--porcelain", "-uno"],
            cwd=target_dir,
            capture_output=True,
            text=True,
            timeout=0.25,
        )
        dirty = len(dirty_res.stdout.strip()) > 0
        return branch, dirty
    except Exception:
        return None, False


def render_statusline(payload, config):
    parts = []
    preset = config.get("preset", "minimal")
    nerd = config.get("nerd_fonts", False)

    glyphs = {
        "idle": "󰄴" if nerd else "●",
        "thinking": "󰘦" if nerd else "◆",
        "working": "󰑮" if nerd else "⟳",
        "tool": "󰒋" if nerd else "⚙",
        "error": "󰅚" if nerd else "✖",
        "git": "󰘬" if nerd else "⎇",
        "model": "󰘧" if nerd else "✦",
        "folder": "󰉋" if nerd else "📁",
        "bolt": "󱐋" if nerd else "⚡",
    }

    # 1. State
    if config.get("show_state", True):
        raw_state = (payload.get("agent_state") or "idle").lower()
        color = C.IDLE
        icon = glyphs["idle"]
        label = raw_state

        if raw_state == "thinking":
            color = C.THINKING
            icon = glyphs["thinking"]
        elif raw_state == "working":
            color = C.WORKING
            icon = glyphs["working"]
        elif "tool" in raw_state:
            color = C.TOOL
            icon = glyphs["tool"]
            label = "tool"
        elif raw_state == "error":
            color = C.ERROR
            icon = glyphs["error"]

        if preset == "pill":
            parts.append(f"{C.BG_STATE} {color}{icon} {C.WHITE}{label} {C.RESET}")
        elif preset == "compact":
            parts.append(f"{color}{icon} {label}{C.RESET}")
        else:
            parts.append(f"{color}{icon} {C.WHITE}{label}{C.RESET}")

    # 2. Model & Effort
    if config.get("show_model", True):
        m = payload.get("model") or {}
        name = m.get("display_name") or m.get("id") or "Gemini"
        if "(" in name:
            name = name.split("(")[0].strip()

        effort_tag = ""
        if config.get("show_effort", True) and m.get("effort"):
            eff = str(m["effort"]).lower()
            effort_tag = f"{C.DIVIDER}[{C.EFFORT}{eff}{C.DIVIDER}]{C.RESET}"

        m_str = f"{C.MODEL}{name}{(' ' + effort_tag) if effort_tag else ''}{C.RESET}"
        if preset == "pill":
            parts.append(f"{C.BG_MODEL} {m_str} {C.RESET}")
        else:
            parts.append(m_str)

    # 3. Context Window Usage (e.g. "20.5k 20%")
    if config.get("show_context", True):
        ctx = payload.get("context_window") or {}
        pct = ctx.get("used_percentage")
        if pct is None and ctx.get("total_input_tokens") and ctx.get("context_window_size"):
            pct = ((ctx["total_input_tokens"] + ctx.get("total_output_tokens", 0)) / ctx["context_window_size"]) * 100
        pct = float(pct) if pct is not None else 0.0

        color = C.CTX_NORMAL
        if pct >= 80:
            color = C.CTX_ALERT
        elif pct >= 55:
            color = C.CTX_WARN

        used = (ctx.get("total_input_tokens") or 0) + (ctx.get("total_output_tokens") or 0)
        token_str = format_tokens(used)
        pct_str = f"{round(pct)}%"
        ctx_segment = f"{C.WHITE}{token_str}{C.RESET} {color}{pct_str}{C.RESET}"

        if preset == "pill":
            parts.append(f"{C.BG_CTX} {ctx_segment} {C.RESET}")
        else:
            parts.append(ctx_segment)

    # 4. Git VCS
    if config.get("show_git", True):
        branch, dirty = get_git_info(payload, payload.get("cwd"))
        if branch:
            dirty_str = f"{C.THINKING}*{C.RESET}" if dirty else ""
            git_seg = f"{C.GIT}{glyphs['git']} {C.WHITE}{branch}{dirty_str}{C.RESET}"
            if preset == "pill":
                parts.append(f"{C.BG_GIT} {git_seg} {C.RESET}")
            else:
                parts.append(git_seg)

    # 5. Workspace
    if config.get("show_workspace"):
        folder = Path(payload.get("cwd") or os.getcwd()).name
        if folder:
            parts.append(f"{C.MUTED}{glyphs['folder']} {folder}{C.RESET}")

    # 6. Tasks / Subagents
    if config.get("show_tasks") and payload:
        task_count = payload.get("task_count", 0)
        subagents = payload.get("subagents", 0)
        sub_count = len(subagents) if isinstance(subagents, list) else int(subagents or 0)
        badges = []
        if task_count > 0:
            badges.append(f"{glyphs['bolt']} {task_count} task{'s' if task_count > 1 else ''}")
        if sub_count > 0:
            badges.append(f"👥 {sub_count} agent{'s' if sub_count > 1 else ''}")
        if badges:
            parts.append(f"{C.EFFORT}{' '.join(badges)}{C.RESET}")

    if preset == "pill":
        return " ".join(parts)

    sep = f" {C.DIVIDER}│{C.RESET} "
    if preset == "dots":
        sep = f" {C.DIVIDER}·{C.RESET} "
    elif preset == "compact":
        sep = f" {C.DIVIDER}|{C.RESET} "
    elif preset == "slash":
        sep = f" {C.DIVIDER}/{C.RESET} "

    return sep.join(parts)


def main():
    config = load_config()

    if "--preview" in sys.argv or "--test" in sys.argv:
        sample = {
            "agent_state": "idle",
            "model": {"display_name": "Gemini 3.8 Flash", "effort": "medium"},
            "context_window": {
                "used_percentage": 20,
                "total_input_tokens": 20100,
                "total_output_tokens": 400,
                "context_window_size": 102400,
            },
            "vcs": {"branch": "main", "dirty": True},
            "cwd": os.getcwd(),
        }
        print(f"\n{C.BOLD}✦ Antigravity CLI Python Statusline Preview ✦{C.RESET}\n")
        for p in ["minimal", "dots", "compact", "slash", "pill"]:
            cfg = dict(config, preset=p)
            print(f"  {p.upper():<10} : {render_statusline(sample, cfg)}")
        print("")
        return

    try:
        raw = sys.stdin.read()
        payload = json.loads(raw) if raw.strip() else {}
    except Exception:
        payload = {"agent_state": "idle"}

    sys.stdout.write(render_statusline(payload, config) + "\n")
    sys.stdout.flush()


if __name__ == "__main__":
    main()

