#!/usr/bin/env node

/**
 * ✦ Antigravity CLI Minimalistic Statusline ✦
 * A clean, ultra-fast, zero-dependency statusline for the Google Antigravity CLI (agy).
 *
 * Supports Windows, Linux, and macOS.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Determine color support
const useColors = !process.env.NO_COLOR && (process.stdout.isTTY || process.env.TERM !== 'dumb');

// 24-bit TrueColor Palette with safe fallbacks
const c = {
  reset: useColors ? '\x1b[0m' : '',
  bold: useColors ? '\x1b[1m' : '',
  dim: useColors ? '\x1b[2m' : '',

  // Palette
  white: useColors ? '\x1b[38;2;241;245;249m' : '',
  muted: useColors ? '\x1b[38;2;148;163;184m' : '',
  divider: useColors ? '\x1b[38;2;71;85;105m' : '',     // Low-contrast slate-gray
  
  // Status Colors
  idle: useColors ? '\x1b[38;2;52;211;153m' : '',       // Emerald green
  thinking: useColors ? '\x1b[38;2;251;191;36m' : '',   // Amber
  working: useColors ? '\x1b[38;2;96;165;250m' : '',    // Sky blue
  tool: useColors ? '\x1b[38;2;192;132;252m' : '',       // Soft purple
  error: useColors ? '\x1b[38;2;248;113;113m' : '',     // Rose red

  // Accent Colors
  model: useColors ? '\x1b[38;2;167;139;250m' : '',     // Violet
  effort: useColors ? '\x1b[38;2;56;189;248m' : '',     // Cyan
  git: useColors ? '\x1b[38;2;251;191;36m' : '',        // Warm yellow
  ctxNormal: useColors ? '\x1b[38;2;45;212;191m' : '',  // Teal
  ctxWarn: useColors ? '\x1b[38;2;251;191;36m' : '',    // Amber
  ctxAlert: useColors ? '\x1b[38;2;248;113;113m' : '',  // Rose

  // Background badges for 'pill' preset
  bgState: useColors ? '\x1b[48;2;15;23;42m' : '',
  bgModel: useColors ? '\x1b[48;2;30;27;75m' : '',
  bgCtx: useColors ? '\x1b[48;2;19;42;42m' : '',
  bgGit: useColors ? '\x1b[48;2;42;36;22m' : '',
};

// Default Configuration
const DEFAULT_CONFIG = {
  preset: 'minimal',          // 'minimal' | 'dots' | 'compact' | 'pill' | 'slash'
  show_state: true,
  show_model: true,
  show_effort: true,
  show_context: true,
  show_git: true,
  show_workspace: false,
  show_tokens: false,         // E.g. (14k/1M) alongside %
  show_tasks: true,           // Background tasks / subagents if active
  nerd_fonts: false,          // Use Nerd Font icons if terminal font supports it
  separator: '│'
};

// Locate and load user configuration
function loadConfig() {
  const searchDirs = [
    __dirname,
    path.join(process.env.USERPROFILE || process.env.HOME || '', '.gemini', 'antigravity-cli')
  ];

  let config = { ...DEFAULT_CONFIG };
  for (const dir of searchDirs) {
    const cfgPath = path.join(dir, 'statusline.json');
    if (fs.existsSync(cfgPath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
        config = { ...config, ...parsed };
        break;
      } catch (e) {}
    }
  }

  // Parse command-line flag overrides
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--preset=')) {
      config.preset = arg.split('=')[1];
    } else if (arg === '--nerd-fonts' || arg === '--nerd') {
      config.nerd_fonts = true;
    } else if (arg === '--tokens') {
      config.show_tokens = true;
    } else if (arg === '--workspace') {
      config.show_workspace = true;
    } else if (arg === '--no-git') {
      config.show_git = false;
    }
  }

  return config;
}

// Compact token representation (e.g. 15.4k, 1.0M)
function formatTokens(num) {
  if (num == null || isNaN(num)) return '0';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(num);
}

// Extract or detect Git branch & uncommitted status
function getGitInfo(payload, targetDir) {
  // Use payload if agy already populated it
  if (payload && payload.vcs && payload.vcs.branch) {
    return {
      branch: payload.vcs.branch,
      dirty: Boolean(payload.vcs.dirty)
    };
  }

  // Fallback to git CLI with short timeouts
  const cwd = targetDir || (payload && payload.cwd) || process.cwd();
  try {
    const branch = execSync('git branch --show-current', {
      cwd,
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 250,
      encoding: 'utf8'
    }).trim();

    if (!branch) return null;

    let dirty = false;
    try {
      const status = execSync('git status --porcelain -uno', {
        cwd,
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 250,
        encoding: 'utf8'
      }).trim();
      dirty = status.length > 0;
    } catch (e) {}

    return { branch, dirty };
  } catch (e) {
    return null;
  }
}

// Format the statusline string
function renderStatusLine(payload, config) {
  const parts = [];
  const preset = config.preset || 'minimal';
  const width = (payload && payload.terminal_width) || process.stdout.columns || 80;
  const isNarrow = width < 80;

  // Icon set
  const glyphs = config.nerd_fonts ? {
    idle: '󰄴',
    thinking: '󰘦',
    working: '󰑮',
    tool: '󰒋',
    error: '󰅚',
    git: '󰘬',
    model: '󰘧',
    ctx: '󰁨',
    folder: '󰉋',
    bolt: '󱐋'
  } : {
    idle: '●',
    thinking: '◆',
    working: '⟳',
    tool: '⚙',
    error: '✖',
    git: '⎇',
    model: '✦',
    ctx: '%',
    folder: '📁',
    bolt: '⚡'
  };

  // 1. Agent State
  if (config.show_state) {
    const rawState = (payload && payload.agent_state ? payload.agent_state : 'idle').toLowerCase();
    let stateColor = c.idle;
    let stateIcon = glyphs.idle;
    let stateText = rawState;

    if (rawState === 'thinking') {
      stateColor = c.thinking;
      stateIcon = glyphs.thinking;
    } else if (rawState === 'working') {
      stateColor = c.working;
      stateIcon = glyphs.working;
    } else if (rawState.includes('tool')) {
      stateColor = c.tool;
      stateIcon = glyphs.tool;
      stateText = 'tool';
    } else if (rawState === 'error') {
      stateColor = c.error;
      stateIcon = glyphs.error;
    }

    if (preset === 'pill') {
      parts.push(`${c.bgState} ${stateColor}${stateIcon} ${c.white}${stateText} ${c.reset}`);
    } else if (preset === 'compact') {
      parts.push(`${stateColor}${stateIcon} ${stateText}${c.reset}`);
    } else {
      parts.push(`${stateColor}${stateIcon} ${c.white}${stateText}${c.reset}`);
    }
  }

  // 2. Active Model & Effort
  if (config.show_model) {
    let name = (payload && payload.model && (payload.model.display_name || payload.model.id)) || 'Gemini';

    // Minimal sanitization of verbose model labels
    name = name.replace(/\s*\([^)]*\)/g, '').trim();
    if (isNarrow) {
      name = name.replace(/Google\s+/gi, '').replace('Gemini', 'Gem');
    }

    let effortTag = '';
    if (config.show_effort && payload && payload.model && payload.model.effort) {
      const eff = String(payload.model.effort).toLowerCase();
      effortTag = `${c.divider}[${c.effort}${eff}${c.divider}]${c.reset}`;
    }

    const modelDisplay = `${c.model}${name}${effortTag ? ' ' + effortTag : ''}${c.reset}`;

    if (preset === 'pill') {
      parts.push(`${c.bgModel} ${modelDisplay} ${c.reset}`);
    } else {
      parts.push(modelDisplay);
    }
  }

  // 3. Context Window Usage
  if (config.show_context) {
    const ctx = (payload && payload.context_window) || {};
    let pct = ctx.used_percentage;

    if (pct == null && ctx.total_input_tokens != null && ctx.context_window_size) {
      pct = ((ctx.total_input_tokens + (ctx.total_output_tokens || 0)) / ctx.context_window_size) * 100;
    }
    pct = (typeof pct === 'number' && !isNaN(pct)) ? pct : 0;

    let color = c.ctxNormal;
    if (pct >= 80) color = c.ctxAlert;
    else if (pct >= 55) color = c.ctxWarn;

    const pctStr = `${pct.toFixed(pct < 10 && pct > 0 ? 1 : 0)}%`;
    let ctxSegment = `${color}${pctStr}${c.reset}`;

    if (config.show_tokens && ctx.context_window_size) {
      const used = (ctx.total_input_tokens || 0) + (ctx.total_output_tokens || 0);
      const cap = ctx.context_window_size;
      ctxSegment += ` ${c.muted}(${formatTokens(used)}/${formatTokens(cap)})${c.reset}`;
    }

    if (preset === 'pill') {
      parts.push(`${c.bgCtx} ${ctxSegment} ${c.reset}`);
    } else if (preset === 'compact') {
      parts.push(ctxSegment);
    } else {
      parts.push(`${ctxSegment} ${c.divider}ctx${c.reset}`);
    }
  }

  // 4. Git Branch & VCS
  if (config.show_git) {
    const git = getGitInfo(payload, payload ? payload.cwd : null);
    if (git && git.branch) {
      // Abbreviate overly long branch names if space is limited
      let bName = git.branch;
      if (bName.length > 20 && isNarrow) {
        bName = bName.slice(0, 18) + '…';
      }
      const dirtyMark = git.dirty ? `${c.thinking}*${c.reset}` : '';
      const gitSegment = `${c.git}${glyphs.git} ${c.white}${bName}${dirtyMark}${c.reset}`;

      if (preset === 'pill') {
        parts.push(`${c.bgGit} ${gitSegment} ${c.reset}`);
      } else {
        parts.push(gitSegment);
      }
    }
  }

  // 5. Workspace Folder (Optional)
  if (config.show_workspace) {
    const cwd = (payload && payload.cwd) || process.cwd();
    const folder = path.basename(cwd);
    if (folder) {
      parts.push(`${c.muted}${glyphs.folder} ${folder}${c.reset}`);
    }
  }

  // 6. Active Tasks or Subagents (Only shown when active)
  if (config.show_tasks && payload) {
    const taskCount = payload.task_count || 0;
    const subagents = Array.isArray(payload.subagents) ? payload.subagents.length : (payload.subagents || 0);
    const badges = [];
    if (taskCount > 0) badges.push(`${glyphs.bolt} ${taskCount} task${taskCount > 1 ? 's' : ''}`);
    if (subagents > 0) badges.push(`👥 ${subagents} agent${subagents > 1 ? 's' : ''}`);
    if (badges.length > 0) {
      parts.push(`${c.effort}${badges.join(' ')}${c.reset}`);
    }
  }

  // Join items based on selected preset
  if (preset === 'pill') {
    return parts.join(' ');
  }

  let sep = ` ${c.divider}│${c.reset} `;
  if (preset === 'dots') {
    sep = ` ${c.divider}·${c.reset} `;
  } else if (preset === 'compact') {
    sep = ` ${c.divider}|${c.reset} `;
  } else if (preset === 'slash') {
    sep = ` ${c.divider}/${c.reset} `;
  } else if (config.separator) {
    sep = ` ${c.divider}${config.separator}${c.reset} `;
  }

  return parts.join(sep);
}

// Interactive Preview Runner
function runPreview(config) {
  const samplePayload = {
    agent_state: 'idle',
    model: {
      id: 'gemini-3.8-flash',
      display_name: 'Gemini 3.8 Flash',
      effort: 'medium'
    },
    context_window: {
      used_percentage: 14.2,
      total_input_tokens: 148900,
      total_output_tokens: 3400,
      context_window_size: 1048576
    },
    vcs: {
      type: 'git',
      branch: 'main',
      dirty: true
    },
    cwd: process.cwd(),
    terminal_width: 100
  };

  console.log(`\n${c.bold}✦ Antigravity CLI Statusline Presets Preview ✦${c.reset}\n`);
  const presets = ['minimal', 'dots', 'compact', 'slash', 'pill'];
  for (const p of presets) {
    const cfg = { ...config, preset: p };
    console.log(`  ${c.bold}${p.toUpperCase().padEnd(10)}${c.reset} : ${renderStatusLine(samplePayload, cfg)}`);
  }

  console.log(`\n${c.bold}✦ Agent States (in 'minimal' preset) ✦${c.reset}\n`);
  const states = ['idle', 'thinking', 'working', 'tool_use'];
  for (const st of states) {
    const sPayload = { ...samplePayload, agent_state: st };
    console.log(`  ${st.padEnd(10)} : ${renderStatusLine(sPayload, { ...config, preset: 'minimal' })}`);
  }
  console.log('');
}

// Handle setting presets directly via CLI (e.g. node statusline.js --set-preset=dots)
function handleSetPreset() {
  const arg = process.argv.find(a => a.startsWith('--set-preset='));
  if (!arg) return false;
  const newPreset = arg.split('=')[1];
  const valid = ['minimal', 'dots', 'compact', 'slash', 'pill'];
  if (!valid.includes(newPreset)) {
    console.log(`Unknown preset: "${newPreset}". Choose from: ${valid.join(', ')}`);
    return true;
  }

  const targets = [
    path.join(__dirname, 'statusline.json'),
    path.join(process.env.USERPROFILE || process.env.HOME || '', '.gemini', 'antigravity-cli', 'statusline.json')
  ];

  for (const t of targets) {
    let cfg = {};
    if (fs.existsSync(t)) {
      try { cfg = JSON.parse(fs.readFileSync(t, 'utf8')); } catch (e) {}
    }
    cfg.preset = newPreset;
    try {
      fs.writeFileSync(t, JSON.stringify(cfg, null, 2), 'utf8');
      console.log(`Updated preset to "${newPreset}" in: ${t}`);
    } catch (e) {}
  }
  return true;
}

// Entry Point
function main() {
  if (handleSetPreset()) {
    return;
  }

  const config = loadConfig();

  if (process.argv.includes('--preview') || process.argv.includes('--test')) {
    runPreview(config);
    return;
  }

  let input = '';
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', chunk => {
    input += chunk;
  });

  process.stdin.on('end', () => {
    let payload = {};
    if (input.trim()) {
      try {
        payload = JSON.parse(input);
      } catch (e) {
        payload = { agent_state: 'idle' };
      }
    }
    const output = renderStatusLine(payload, config);
    console.log(output);
  });

  // Safety fallback if stdin hangs
  setTimeout(() => {
    if (!input) {
      console.log(`${c.idle}●${c.reset} ${c.white}idle${c.reset} ${c.divider}│${c.reset} ${c.model}Gemini${c.reset}`);
      process.exit(0);
    }
  }, 1500);
}

main();
