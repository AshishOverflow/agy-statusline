#!/usr/bin/env python3
"""
✦ Antigravity CLI Minimalistic 2-Line Statusline (Python) ✦
A sleek, ultra-fast, zero-dependency 2-line statusline for Google Antigravity CLI (agy).
"""

import sys
import os
import json
import time
import tempfile
from pathlib import Path

# Force UTF-8 I/O on Windows to prevent cp1252 UnicodeEncodeError
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if hasattr(sys.stdin, "reconfigure"):
    try:
        sys.stdin.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

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
    "multiline": True,
    "show_state": True,
    "show_model": True,
    "show_effort": True,
    "show_context": True,
    "show_limits": True,
    "show_git": True,
    "show_workspace": False,
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
        try:
            if p.exists():
                with open(p, "r", encoding="utf-8") as f:
                    config.update(json.load(f))
                break
        except Exception:
            pass

    for arg in sys.argv[1:]:
        if arg.startswith("--preset="):
            config["preset"] = arg.split("=")[1]
        elif arg == "--single-line":
            config["multiline"] = False
        elif arg in ("--nerd-fonts", "--nerd"):
            config["nerd_fonts"] = True
        elif arg == "--workspace":
            config["show_workspace"] = True
        elif arg == "--no-git":
            config["show_git"] = False
        elif arg == "--no-limits":
            config["show_limits"] = False

    return config


def handle_set_preset():
    target_arg = None
    for a in sys.argv[1:]:
        if a.startswith("--set-preset="):
            target_arg = a
            break
    if not target_arg:
        return False

    new_preset = target_arg.split("=")[1].strip()
    valid = ["minimal", "dots", "compact", "slash", "pill"]
    if new_preset not in valid:
        print(f"Unknown preset: '{new_preset}'. Choose from: {', '.join(valid)}")
        return True

    targets = [
        Path(__file__).parent / "statusline.json",
        Path.home() / ".gemini" / "antigravity-cli" / "statusline.json",
    ]
    for t in targets:
        cfg = {}
        try:
            if t.exists():
                with open(t, "r", encoding="utf-8") as f:
                    cfg = json.load(f)
        except Exception:
            pass
        cfg["preset"] = new_preset
        try:
            with open(t, "w", encoding="utf-8") as f:
                json.dump(cfg, f, indent=2)
            print(f"Updated preset to '{new_preset}' in: {t}")
        except Exception:
            pass
    return True


def format_tokens(n):
    if n is None:
        return "0"
    if n >= 1_000_000:
        return f"{n / 1_000_000:.1f}".rstrip("0").rstrip(".") + "M"
    if n >= 1_000:
        return f"{n / 1_000:.1f}".rstrip("0").rstrip(".") + "k"
    return str(n)


def format_time_remaining(seconds):
    if seconds is None:
        return None
    if seconds <= 0:
        return "0m"
    s = int(round(seconds))
    d = s // 86400
    h = (s % 86400) // 3600
    m = (s % 3600) // 60

    if d > 0:
        return f"{d}d {h}h" if h > 0 else f"{d}d"
    if h > 0:
        return f"{h}h {m}m" if m > 0 else f"{h}h"
    if m > 0:
        return f"{m}m"
    return f"{s}s"


def get_git_info_fast(payload):
    if payload and payload.get("vcs", {}).get("branch"):
        return payload["vcs"]["branch"], bool(payload["vcs"].get("dirty"))

    start_dir = Path((payload.get("cwd") if payload else None) or os.getcwd())
    try:
        cur = start_dir
        git_dir = None
        for _ in range(4):
            candidate = cur / ".git"
            if candidate.exists():
                git_dir = candidate
                break
            if cur.parent == cur:
                break
            cur = cur.parent

        if not git_dir:
            return None, False

        head_path = git_dir / "HEAD"
        if git_dir.is_file():
            content = git_dir.read_text(encoding="utf-8").strip()
            if content.startswith("gitdir:"):
                rel = content[7:].strip()
                real_dir = Path(rel) if os.path.isabs(rel) else git_dir.parent / rel
                head_path = real_dir / "HEAD"

        if not head_path.exists():
            return None, False

        head = head_path.read_text(encoding="utf-8").strip()
        branch = head[16:].strip() if head.startswith("ref: refs/heads/") else head[:7]
        dirty = bool(payload and payload.get("vcs", {}).get("dirty"))
        return branch, dirty
    except Exception:
        return None, False


def parse_quota(payload):
    raw = (
        payload.get("quota")
        or payload.get("rate_limits")
        or payload.get("limits")
        or payload.get("quotas")
    )
    buckets = {}

    if isinstance(raw, list):
        for item in raw:
            i_id = str(
                item.get("window")
                or item.get("bucket_id")
                or item.get("bucketId")
                or item.get("display_name")
                or item.get("id")
                or ""
            ).lower()
            if "5h" in i_id or "five" in i_id:
                buckets["5h"] = item
            elif "7d" in i_id or "seven" in i_id or "week" in i_id:
                buckets["7d"] = item
    elif isinstance(raw, dict):
        for k, v in raw.items():
            k_low = k.lower()
            if k_low == "5h" or "five" in k_low:
                buckets["5h"] = v
            elif k_low == "7d" or "seven" in k_low or "week" in k_low:
                buckets["7d"] = v

    cache_path = Path(tempfile.gettempdir()) / "agy_quota_cache.json"
    if buckets:
        try:
            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump({"timestamp": time.time(), "buckets": buckets}, f)
        except Exception:
            pass
    else:
        try:
            if cache_path.exists():
                with open(cache_path, "r", encoding="utf-8") as f:
                    cached = json.load(f)
                    if cached and "buckets" in cached:
                        buckets = cached["buckets"]
        except Exception:
            pass

    def extract_bucket(b):
        if not b:
            return None
        pct = None
        if b.get("remaining_fraction") is not None:
            pct = round(b["remaining_fraction"] * 100)
        elif b.get("used_percentage") is not None:
            pct = round(100 - b["used_percentage"])
        elif b.get("remaining") is not None and b.get("total") and b["total"] > 0:
            pct = round((b["remaining"] / b["total"]) * 100)
        elif b.get("percentage") is not None:
            pct = round(b["percentage"])

        seconds_left = None
        if b.get("reset_in_seconds") is not None:
            seconds_left = float(b["reset_in_seconds"])
        elif b.get("reset_time") or b.get("resets_at") or b.get("expiry"):
            t = b.get("reset_time") or b.get("resets_at") or b.get("expiry")
            if isinstance(t, (int, float)):
                t_sec = t if t < 1e11 else t / 1000
                seconds_left = max(0, t_sec - time.time())
            elif isinstance(t, str):
                try:
                    import datetime
                    dt = datetime.datetime.fromisoformat(t.replace("Z", "+00:00"))
                    seconds_left = max(0, dt.timestamp() - time.time())
                except Exception:
                    pass

        return {"pct": pct, "seconds_left": seconds_left}

    return {
        "b5h": extract_bucket(buckets.get("5h")),
        "b7d": extract_bucket(buckets.get("7d")),
    }


def format_quota_segment(name, bucket_info, preset):
    if not bucket_info:
        return None
    pct = bucket_info.get("pct")
    sec = bucket_info.get("seconds_left")
    if pct is None and sec is None:
        return None

    color = C.CTX_NORMAL
    if pct is not None:
        if pct <= 20:
            color = C.ERROR
        elif pct <= 50:
            color = C.THINKING

    pct_part = f"{color}{pct}%{C.RESET}" if pct is not None else ""
    time_str = format_time_remaining(sec)
    time_part = f" {C.MUTED}({time_str}){C.RESET}" if time_str else ""

    if preset == "pill":
        return f"{C.BG_CTX} {C.WHITE}{name}:{C.RESET} {pct_part}{time_part} {C.RESET}"
    return f"{C.WHITE}{name}:{C.RESET} {pct_part}{time_part}"


def render_statusline(payload, config):
    line1_parts = []
    line2_parts = []
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

    # LINE 1: Agent State
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
            line1_parts.append(f"{C.BG_STATE} {color}{icon} {C.WHITE}{label} {C.RESET}")
        elif preset == "compact":
            line1_parts.append(f"{color}{icon} {label}{C.RESET}")
        else:
            line1_parts.append(f"{color}{icon} {C.WHITE}{label}{C.RESET}")

    # LINE 1: Model & Effort
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
            line1_parts.append(f"{C.BG_MODEL} {m_str} {C.RESET}")
        else:
            line1_parts.append(m_str)

    # LINE 1: Git Branch
    if config.get("show_git", True):
        branch, dirty = get_git_info_fast(payload)
        if branch:
            dirty_str = f"{C.THINKING}*{C.RESET}" if dirty else ""
            git_seg = f"{C.GIT}{glyphs['git']} {C.WHITE}{branch}{dirty_str}{C.RESET}"
            if preset == "pill":
                line1_parts.append(f"{C.BG_GIT} {git_seg} {C.RESET}")
            else:
                line1_parts.append(git_seg)

    # LINE 1: Workspace Folder (Optional)
    if config.get("show_workspace"):
        folder = Path(payload.get("cwd") or os.getcwd()).name
        if folder:
            line1_parts.append(f"{C.MUTED}{glyphs['folder']} {folder}{C.RESET}")

    # LINE 1: Active Tasks / Subagents
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
            line1_parts.append(f"{C.EFFORT}{' '.join(badges)}{C.RESET}")

    # LINE 2: Context Window ("20.5k 20%")
    if config.get("show_context", True):
        ctx = payload.get("context_window") or {}
        pct = ctx.get("used_percentage")
        if pct is None and ctx.get("total_input_tokens") and ctx.get("context_window_size"):
            pct = (
                (ctx["total_input_tokens"] + ctx.get("total_output_tokens", 0))
                / ctx["context_window_size"]
            ) * 100
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
            line2_parts.append(f"{C.BG_CTX} {ctx_segment} {C.RESET}")
        else:
            line2_parts.append(ctx_segment)

    # LINE 2: 5h and 7d limits with time remaining
    if config.get("show_limits", True):
        q = parse_quota(payload)
        q5h = format_quota_segment("5h", q.get("b5h"), preset)
        q7d = format_quota_segment("7d", q.get("b7d"), preset)
        if q5h:
            line2_parts.append(q5h)
        if q7d:
            line2_parts.append(q7d)

    sep = f" {C.DIVIDER}│{C.RESET} "
    if preset == "dots":
        sep = f" {C.DIVIDER}·{C.RESET} "
    elif preset == "compact":
        sep = f" {C.DIVIDER}|{C.RESET} "
    elif preset == "slash":
        sep = f" {C.DIVIDER}/{C.RESET} "
    elif preset == "pill":
        sep = " "
    elif config.get("separator"):
        sep = f" {C.DIVIDER}{config['separator']}{C.RESET} "

    l1 = sep.join(line1_parts)
    l2 = sep.join(line2_parts)

    if config.get("multiline", True) and line2_parts:
        return f"{l1}\n{l2}"
    if line2_parts:
        return f"{l1}{sep}{l2}"
    return l1


def main():
    if handle_set_preset():
        return

    config = load_config()

    if "--preview" in sys.argv or "--test" in sys.argv:
        sample = {
            "agent_state": "idle",
            "model": {"display_name": "Gemini 3.8 Flash", "effort": "high"},
            "context_window": {
                "used_percentage": 20,
                "total_input_tokens": 20100,
                "total_output_tokens": 400,
                "context_window_size": 102400,
            },
            "quota": {
                "5h": {"remaining_fraction": 0.82, "reset_in_seconds": 13320},
                "7d": {"remaining_fraction": 0.65, "reset_in_seconds": 388800},
            },
            "vcs": {"branch": "main", "dirty": False},
            "cwd": os.getcwd(),
        }
        print(f"\n{C.BOLD}✦ Antigravity CLI 2-Line Statusline Preview ✦{C.RESET}\n")
        for p in ["minimal", "dots", "compact", "slash", "pill"]:
            cfg = dict(config, preset=p)
            print(f"{C.BOLD}{p.upper()}:{C.RESET}")
            res = render_statusline(sample, cfg)
            for l in res.split("\n"):
                print(f"  {l}")
            print("")
        return

    try:
        raw = sys.stdin.read()
        payload = json.loads(raw) if raw.strip() else {}
    except Exception:
        payload = {"agent_state": "idle"}

    try:
        output_str = render_statusline(payload, config) + "\n"
        if hasattr(sys.stdout, "buffer"):
            sys.stdout.buffer.write(output_str.encode("utf-8", errors="replace"))
            sys.stdout.buffer.flush()
        else:
            sys.stdout.write(output_str)
            sys.stdout.flush()
    except Exception:
        # Failsafe fallback
        try:
            sys.stdout.write("● idle | Gemini\n")
            sys.stdout.flush()
        except Exception:
            pass


if __name__ == "__main__":
    main()
