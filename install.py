#!/usr/bin/env python3
"""
✦ Antigravity CLI Python Statusline Installer ✦
Sets up and registers the Python statusline in Antigravity CLI.
"""

import sys
import os
import json
import shutil
import subprocess
from pathlib import Path

print("\n======================================================")
print("   ✦ Antigravity CLI Python Statusline Setup ✦  ")
print("======================================================\n")

home_dir = os.environ.get("USERPROFILE") or os.environ.get("HOME")
if not home_dir:
    print("❌ Could not locate user home directory.")
    sys.exit(1)

agy_dir = Path(home_dir) / ".gemini" / "antigravity-cli"
agy_dir.mkdir(parents=True, exist_ok=True)
print(f"[1/4] Antigravity CLI directory: {agy_dir}")

# 1. Copy statusline.py and statusline.json
current_dir = Path(__file__).parent
for fname in ["statusline.py", "statusline.json"]:
    src = current_dir / fname
    dst = agy_dir / fname
    if src.exists():
        shutil.copy2(src, dst)
        print(f"      ✓ Copied {fname}")

# 2. Resolve space-safe path on Windows
script_path = str(agy_dir / "statusline.py")
configured_command = f"python -X utf8 {script_path}"

if sys.platform == "win32":
    try:
        res = subprocess.run(
            f'cmd /c "for %I in ("{home_dir}") do @echo %~sI"',
            capture_output=True,
            text=True,
            shell=True,
        )
        short_home = res.stdout.strip()
        if short_home and " " not in short_home:
            clean_path = Path(short_home) / ".gemini" / "antigravity-cli" / "statusline.py"
            configured_command = f"python -X utf8 {clean_path}"
    except Exception:
        configured_command = f'python -X utf8 "{script_path}"'

print(f"[2/4] Space-safe command: {configured_command}")

# 3. Update settings.json
settings_file = agy_dir / "settings.json"
settings = {}
if settings_file.exists():
    try:
        with open(settings_file, "r", encoding="utf-8") as f:
            settings = json.load(f)
    except Exception:
        settings = {}

settings["statusLine"] = {
    "type": "command",
    "command": configured_command,
    "enabled": True,
    "padding": 0,
    "stack_with_default": False,
}

with open(settings_file, "w", encoding="utf-8") as f:
    json.dump(settings, f, indent=2)

print(f"[3/4] Successfully updated settings.json:")
print(f"      {settings_file}")

# 4. Verify execution
print(f"[4/4] Verifying statusline execution...")
sample_payload = json.dumps({
    "agent_state": "idle",
    "model": {"display_name": "Gemini 3.8 Flash", "effort": "high"},
    "context_window": {
        "used_percentage": 20,
        "total_input_tokens": 20100,
        "total_output_tokens": 400,
    },
    "quota": {
        "5h": {"remaining_fraction": 0.82, "reset_in_seconds": 13320},
        "7d": {"remaining_fraction": 0.65, "reset_in_seconds": 388800},
    },
    "vcs": {"branch": "main"},
})

try:
    proc = subprocess.run(
        configured_command,
        input=sample_payload,
        capture_output=True,
        text=True,
        shell=True,
    )
    print("\n  Result:")
    for line in proc.stdout.strip().split("\n"):
        print(f"    {line}")
    print("\n✨ Done! Your Python statusline is active in Antigravity CLI.")
    print("   Launch agy or type /statusline to confirm!\n")
except Exception as e:
    print(f"⚠️ Verification note: {e}")

