# ✦ agy-statusline ✦

A sleek, minimalistic, ultra-fast 2-line statusline for the **Google Antigravity CLI (`agy`)**, written in pure **Python 3**.

Designed to give you high-signal session telemetry at a glance without cluttering your terminal.

```text
● idle │ Gemini 3.8 Flash [high] │ ⎇ main
20.5k 20% │ 5h: 82% (3h 42m) │ 7d: 65% (4d 12h)
```

---

## ✨ Features

- **Minimalist & Distraction-Free**: Muted colors, low-contrast separators, and clean typography.
- **2-Line Telemetry Layout**:
  - **Line 1 (Session & Environment)**:
    - **Agent State**: Color-coded indicator (`● idle`, `◆ thinking`, `⟳ working`, `⚙ tool`, `✖ error`).
    - **Active Model & Effort**: Clean model name with reasoning effort tier (`Gemini 3.8 Flash [high]`).
    - **Git Branch**: Instant filesystem-based branch resolution without spawning slow subprocesses (`⎇ main`).
  - **Line 2 (Context & Quotas)**:
    - **Context Window**: Current session token usage and percentage (`20.5k 20%`).
    - **5-Hour Rolling Limit**: Remaining quota percentage and countdown to expiration (`5h: 82% (3h 42m)`).
    - **7-Day Weekly Limit**: Remaining quota percentage and countdown to expiration (`7d: 65% (4d 12h)`).
- **Blazing Fast**: Pure Python standard library with sub-millisecond Git HEAD parsing and zero external packages.
- **Windows Path Resilient**: Automatically resolves username spaces (e.g. `C:\Users\First Last`) using Windows 8.3 short paths in `settings.json`, preventing `'C:\Users\...' is not recognized` command errors.
- **Multiple Built-in Presets**: Switch instantly between `minimal`, `dots`, `compact`, `slash`, or `pill` styles.
- **Cross-Platform**: Fully compatible with Windows (Command Prompt, PowerShell, Windows Terminal), Linux, and macOS.

---

## 🎨 Presets Preview

Run `python statusline.py --preview` in your terminal to view all styles live:

```text
MINIMAL:
  ● idle │ Gemini 3.8 Flash [high] │ ⎇ main
  20.5k 20% │ 5h: 82% (3h 42m) │ 7d: 65% (4d 12h)

DOTS:
  ● idle · Gemini 3.8 Flash [high] · ⎇ main
  20.5k 20% · 5h: 82% (3h 42m) · 7d: 65% (4d 12h)

COMPACT:
  ● idle | Gemini 3.8 Flash [high] | ⎇ main
  20.5k 20% | 5h: 82% (3h 42m) | 7d: 65% (4d 12h)

SLASH:
  ● idle / Gemini 3.8 Flash [high] / ⎇ main
  20.5k 20% / 5h: 82% (3h 42m) / 7d: 65% (4d 12h)

PILL:
   ● idle   Gemini 3.8 Flash [high]   ⎇ main 
   20.5k 20%   5h: 82% (3h 42m)   7d: 65% (4d 12h) 
```

---

## 🚀 Installation & Setup

### Automatic Setup (One Command)

From this directory, run:

```bash
python install.py
```

This will:
1. Copy `statusline.py` and `statusline.json` to `~/.gemini/antigravity-cli/`.
2. Configure `~/.gemini/antigravity-cli/settings.json` with the space-safe Python command.
3. Test and verify the statusline output immediately.

Once installed, start or restart your `agy` CLI to see the statusline.

---

## ⚙️ Configuration (`statusline.json`)

You can customize your statusline by editing `~/.gemini/antigravity-cli/statusline.json`:

```json
{
  "preset": "minimal",
  "multiline": true,
  "show_state": true,
  "show_model": true,
  "show_effort": true,
  "show_context": true,
  "show_limits": true,
  "show_git": true,
  "show_workspace": false,
  "show_tasks": true,
  "nerd_fonts": false,
  "separator": "│"
}
```

### Changing Presets via CLI:

You can switch presets anytime with:

```bash
python statusline.py --set-preset=dots
# Available presets: minimal, dots, compact, slash, pill
```

### Options Reference:

| Setting | Default | Description |
| :--- | :--- | :--- |
| `preset` | `"minimal"` | Layout style: `"minimal"`, `"dots"`, `"compact"`, `"slash"`, `"pill"` |
| `multiline` | `true` | Two-line layout (Line 1: Model/Git, Line 2: Context/Limits) |
| `show_state` | `true` | Show agent status indicator (`idle`, `thinking`, `working`, `tool`) |
| `show_model` | `true` | Show active AI model name |
| `show_effort` | `true` | Show reasoning effort tier (e.g. `[high]`, `[medium]`) |
| `show_context`| `true` | Show current session tokens & percentage (`20.5k 20%`) |
| `show_limits` | `true` | Show 5h and 7d quota percentages with time remaining countdown |
| `show_git` | `true` | Show git branch (`⎇ main`) |
| `show_workspace`| `false`| Show workspace folder name |
| `show_tasks` | `true` | Show active background tasks or subagents counter when running |
| `nerd_fonts` | `false`| Use icons if your terminal font supports Nerd Fonts |
| `separator` | `"│"` | Separator glyph between telemetry segments |

---

## 🎮 CLI Controls

Inside an active `agy` CLI session:

- `/statusline` — Toggle statusline on / off.
- `/statusline on` (or `/statusline enable`) — Explicitly turn it on.
- `/statusline off` — Turn it off.
- `/statusline delete` — Reset to default built-in CLI statusline.

---

## 📄 License

MIT
