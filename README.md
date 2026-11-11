# ✦ agy-statusline ✦

A sleek, minimalistic, ultra-fast statusline for the **Google Antigravity CLI (`agy`)**.

Designed to give you high-signal session telemetry at a glance without cluttering your terminal.

```text
● idle │ Gemini 3.8 Flash [medium] │ 14% ctx │ ⎇ main*
```

---

## ✨ Highlights

- **Minimalist & Distraction-Free**: Muted colors, low-contrast separators, and clean typography.
- **High-Signal Telemetry**:
  - **Agent State**: Color-coded indicator (`● idle`, `◆ thinking`, `⟳ working`, `⚙ tool`, `✖ error`).
  - **Active Model & Effort**: Clean model name with optional reasoning effort tag (`[medium]`, `[high]`).
  - **Context Window Utilization**: Percentage used with dynamic green → amber → red warning thresholds.
  - **Git VCS**: Current branch and uncommitted dirty indicator (`⎇ main*`).
  - **Background Tasks & Subagents**: Automatically reveals count when active (`⚡ 2 tasks`, `👥 1 agent`).
- **Blazing Fast**: Sub-30ms startup with **zero external dependencies** (uses Node.js or Python standard libraries).
- **Windows Path Resilient**: Automatically handles username spaces (e.g. `C:\Users\First Last`) via safe 8.3 short paths, eliminating the notorious `'C:\Users\...' is not recognized` command error.
- **Multiple Presets**: Switch instantly between `minimal`, `dots`, `compact`, `slash`, or `pill` badge styles.
- **Cross-Platform**: Fully compatible with Windows (Command Prompt, PowerShell, Windows Terminal), Linux, and macOS.

---

## 🎨 Presets Preview

Run `node statusline.js --preview` in your terminal to view presets live:

```text
  MINIMAL    : ● idle │ Gemini 3.8 Flash [medium] │ 14% ctx │ ⎇ main*
  DOTS       : ● idle · Gemini 3.8 Flash [medium] · 14% ctx · ⎇ main*
  COMPACT    : ● idle | Gemini 3.8 Flash [medium] | 14% | ⎇ main*
  SLASH      : ● idle / Gemini 3.8 Flash [medium] / 14% ctx / ⎇ main*
  PILL       :  ● idle   Gemini 3.8 Flash [medium]   14%   ⎇ main* 
```

### Agent States
```text
  idle       : ● idle │ Gemini 3.8 Flash [medium] │ 14% ctx │ ⎇ main*
  thinking   : ◆ thinking │ Gemini 3.8 Flash [medium] │ 14% ctx │ ⎇ main*
  working    : ⟳ working │ Gemini 3.8 Flash [medium] │ 14% ctx │ ⎇ main*
  tool_use   : ⚙ tool │ Gemini 3.8 Flash [medium] │ 14% ctx │ ⎇ main*
```

---

## 🚀 Installation & Setup

### Automatic Setup (One Command)

From this repository directory, run:

```bash
node install.js
```

This will:
1. Copy the statusline scripts and config to `~/.gemini/antigravity-cli/`.
2. Configure `~/.gemini/antigravity-cli/settings.json` with the space-safe command.
3. Test and verify the statusline output.

Once completed, start or restart your `agy` CLI session to enjoy your new statusline!

---

## ⚙️ Configuration (`statusline.json`)

You can customize your statusline by editing `~/.gemini/antigravity-cli/statusline.json`:

```json
{
  "preset": "minimal",
  "show_state": true,
  "show_model": true,
  "show_effort": true,
  "show_context": true,
  "show_git": true,
  "show_workspace": false,
  "show_tokens": false,
  "show_tasks": true,
  "nerd_fonts": false,
  "separator": "│"
}
```

### Options:

| Setting | Default | Description |
| :--- | :--- | :--- |
| `preset` | `"minimal"` | Layout style: `"minimal"`, `"dots"`, `"compact"`, `"slash"`, `"pill"` |
| `show_state` | `true` | Show agent activity state (`idle`, `thinking`, `working`, `tool`) |
| `show_model` | `true` | Show active AI model name |
| `show_effort` | `true` | Show reasoning effort badge (e.g. `[med]`, `[high]`) |
| `show_context`| `true` | Show context window usage percentage |
| `show_tokens` | `false`| Show token numbers (e.g. `14% (150k/1M)`) |
| `show_git` | `true` | Show git branch and dirty marker (`⎇ main*`) |
| `show_workspace`| `false`| Show current project folder name |
| `show_tasks` | `true` | Dynamically show active background tasks or subagents |
| `nerd_fonts` | `false`| Enable icons if your terminal font supports Nerd Fonts |
| `separator` | `"│"` | Custom separator character for the `"minimal"` style |

---

## 🎮 CLI Controls

Inside an active `agy` CLI session, you can toggle or inspect the statusline with slash commands:

- `/statusline` — Toggle statusline on / off.
- `/statusline on` (or `/statusline enable`) — Explicitly turn it on.
- `/statusline off` — Turn it off.
- `/statusline delete` — Reset to default built-in CLI statusline.

---

## 💡 Troubleshooting Windows Path Spaces

If your Windows user directory contains spaces (e.g. `C:\Users\John Doe\`), Windows `cmd.exe /c` can fail to parse the script path:
```text
'C:\Users\John' is not recognized as an internal or external command
```
`agy-statusline`'s installer automatically detects this and applies the Windows 8.3 short path representation in `~/.gemini/antigravity-cli/settings.json`:
```json
{
  "statusLine": {
    "type": "command",
    "command": "node C:\\Users\\ASHISH~1\\.gemini\\antigravity-cli\\statusline.js",
    "enabled": true
  }
}
```
This guarantees reliable execution in all terminal environments.

---

## 📄 License

MIT
