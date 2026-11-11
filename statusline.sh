#!/bin/bash
# ✦ Antigravity CLI Minimalistic Statusline (Shell) ✦
# Wraps node or python or runs natively

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

if command -v node >/dev/null 2>&1; then
  exec node "$DIR/statusline.js" "$@"
elif command -v python3 >/dev/null 2>&1; then
  exec python3 "$DIR/statusline.py" "$@"
elif command -v python >/dev/null 2>&1; then
  exec python "$DIR/statusline.py" "$@"
else
  # Minimal fallback
  echo -e "\033[38;2;52;211;153m●\033[0m idle \033[38;2;71;85;105m│\033[0m \033[38;2;167;139;250mGemini\033[0m"
fi
