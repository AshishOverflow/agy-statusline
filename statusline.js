#!/usr/bin/env node

/**
 * ✦ Antigravity CLI Minimalistic Statusline ✦
 * A clean, ultra-fast, zero-dependency 2-line statusline for the Google Antigravity CLI (agy).
 *
 * Supports Windows, Linux, and macOS.
 */

const fs = require('fs');
const path = require('path');

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
  multiline: true,            // 2-line layout: Line 1 = State/Model/Git, Line 2 = Context + Quota Limits
  show_state: true,
  show_model: true,
  show_effort: true,
  show_context: true,
  show_limits: true,          // 5h and 7d quota limits with time remaining
  show_git: true,
  show_workspace: false,
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
    } else if (arg === '--single-line') {
      config.multiline = false;
    } else if (arg === '--nerd-fonts' || arg === '--nerd') {
      config.nerd_fonts = true;
    } else if (arg === '--workspace') {
      config.show_workspace = true;
    } else if (arg === '--no-git') {
      config.show_git = false;
    } else if (arg === '--no-limits') {
      config.show_limits = false;
    }
  }

  return config;
}

// Compact token representation (e.g. 20.5k, 1.0M)
function formatTokens(num) {
  if (num == null || isNaN(num)) return '0';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(num);
}

// Format seconds into compact readable time remaining (e.g. "3h 42m", "4d 12h")
function formatTimeRemaining(seconds) {
  if (seconds == null || isNaN(seconds)) return null;
  if (seconds <= 0) return '0m';
  const s = Math.round(seconds);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);

  if (d > 0) {
    return h > 0 ? `${d}d ${h}h` : `${d}d`;
  }
  if (h > 0) {
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  if (m > 0) {
    return `${m}m`;
  }
  return `${s}s`;
}

// Ultra-fast pure fs Git detection without spawning any subprocesses (< 0.5ms)
function getGitInfoFast(payload) {
  if (payload && payload.vcs && payload.vcs.branch) {
    return {
      branch: payload.vcs.branch,
      dirty: Boolean(payload.vcs.dirty)
    };
  }

  const startDir = (payload && payload.cwd) || process.cwd();
  try {
    let cur = startDir;
    let gitDir = null;
    for (let i = 0; i < 4; i++) {
      const candidate = path.join(cur, '.git');
      if (fs.existsSync(candidate)) {
        gitDir = candidate;
        break;
      }
      const parent = path.dirname(cur);
      if (parent === cur) break;
      cur = parent;
    }

    if (!gitDir) return null;

    let headPath = path.join(gitDir, 'HEAD');
    const stat = fs.statSync(gitDir);
    if (!stat.isDirectory()) {
      const gitContent = fs.readFileSync(gitDir, 'utf8').trim();
      if (gitContent.startsWith('gitdir:')) {
        const rel = gitContent.slice(7).trim();
        const realGitDir = path.isAbsolute(rel) ? rel : path.resolve(path.dirname(gitDir), rel);
        headPath = path.join(realGitDir, 'HEAD');
      }
    }

    if (!fs.existsSync(headPath)) return null;
    const headContent = fs.readFileSync(headPath, 'utf8').trim();
    let branch = '';
    if (headContent.startsWith('ref: refs/heads/')) {
      branch = headContent.slice(16).trim();
    } else {
      branch = headContent.slice(0, 7);
    }

    const dirty = Boolean(payload && payload.vcs && payload.vcs.dirty);
    return { branch, dirty };
  } catch (e) {
    return null;
  }
}

// Parse 5h and 7d quota buckets and compute remaining time
function parseQuota(payload) {
  const raw = payload && (payload.quota || payload.rate_limits || payload.limits || payload.quotas);
  let buckets = {};

  if (Array.isArray(raw)) {
    for (const item of raw) {
      const id = String(item.window || item.bucket_id || item.bucketId || item.display_name || item.id || '').toLowerCase();
      if (id.includes('5h') || id.includes('five')) {
        buckets['5h'] = item;
      } else if (id.includes('7d') || id.includes('seven') || id.includes('week')) {
        buckets['7d'] = item;
      }
    }
  } else if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw)) {
      const key = k.toLowerCase();
      if (key === '5h' || key.includes('five')) {
        buckets['5h'] = v;
      } else if (key === '7d' || key.includes('seven') || key.includes('week')) {
        buckets['7d'] = v;
      }
    }
  }

  // Persistent cache support for smooth transitions
  const cachePath = path.join(process.env.USERPROFILE || process.env.HOME || '', '.gemini', 'antigravity-cli', '.quota_cache.json');
  if (Object.keys(buckets).length > 0) {
    try {
      fs.writeFileSync(cachePath, JSON.stringify({ timestamp: Date.now(), buckets }), 'utf8');
    } catch (e) {}
  } else {
    try {
      if (fs.existsSync(cachePath)) {
        const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
        if (cached && cached.buckets) {
          buckets = cached.buckets;
        }
      }
    } catch (e) {}
  }

  function extractBucket(b) {
    if (!b) return null;
    let pct = null;
    if (b.remaining_fraction != null) {
      pct = Math.round(b.remaining_fraction * 100);
    } else if (b.used_percentage != null) {
      pct = Math.round(100 - b.used_percentage);
    } else if (b.remaining != null && b.total != null && b.total > 0) {
      pct = Math.round((b.remaining / b.total) * 100);
    } else if (b.percentage != null) {
      pct = Math.round(b.percentage);
    }

    let secondsLeft = null;
    if (b.reset_in_seconds != null) {
      secondsLeft = Number(b.reset_in_seconds);
    } else if (b.reset_time != null || b.resets_at != null || b.expiry != null) {
      const t = b.reset_time || b.resets_at || b.expiry;
      const targetMs = (typeof t === 'number' && t < 1e11) ? t * 1000 : new Date(t).getTime();
      if (!isNaN(targetMs)) {
        secondsLeft = Math.max(0, Math.round((targetMs - Date.now()) / 1000));
      }
    }

    return { pct, secondsLeft };
  }

  return {
    b5h: extractBucket(buckets['5h']),
    b7d: extractBucket(buckets['7d'])
  };
}

// Format a quota segment like "5h: 82% (3h 42m)"
function formatQuotaSegment(name, bucketInfo, preset) {
  if (!bucketInfo) return null;
  const { pct, secondsLeft } = bucketInfo;
  if (pct == null && secondsLeft == null) return null;

  let color = c.ctxNormal;
  if (pct != null) {
    if (pct <= 20) color = c.error;
    else if (pct <= 50) color = c.thinking;
  }

  const pctPart = pct != null ? `${color}${pct}%${c.reset}` : '';
  const timeStr = formatTimeRemaining(secondsLeft);
  const timePart = timeStr ? ` ${c.muted}(${timeStr})${c.reset}` : '';

  if (preset === 'pill') {
    return `${c.bgCtx} ${c.white}${name}:${c.reset} ${pctPart}${timePart} ${c.reset}`;
  }
  return `${c.white}${name}:${c.reset} ${pctPart}${timePart}`;
}

// Render the statusline string based on payload & config
function renderStatusLine(payload, config) {
  const line1Parts = [];
  const line2Parts = [];
  const preset = config.preset || 'minimal';
  const width = (payload && payload.terminal_width) || process.stdout.columns || 80;
  const isNarrow = width < 80;

  // Glyph set
  const glyphs = config.nerd_fonts ? {
    idle: '󰄴',
    thinking: '󰘦',
    working: '󰑮',
    tool: '󰒋',
    error: '󰅚',
    git: '󰘬',
    model: '󰘧',
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
    folder: '📁',
    bolt: '⚡'
  };

  // --- LINE 1: Agent State, Model, Git, Tasks ---

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
      line1Parts.push(`${c.bgState} ${stateColor}${stateIcon} ${c.white}${stateText} ${c.reset}`);
    } else if (preset === 'compact') {
      line1Parts.push(`${stateColor}${stateIcon} ${stateText}${c.reset}`);
    } else {
      line1Parts.push(`${stateColor}${stateIcon} ${c.white}${stateText}${c.reset}`);
    }
  }

  // 2. Active Model & Effort
  if (config.show_model) {
    let name = (payload && payload.model && (payload.model.display_name || payload.model.id)) || 'Gemini';

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
      line1Parts.push(`${c.bgModel} ${modelDisplay} ${c.reset}`);
    } else {
      line1Parts.push(modelDisplay);
    }
  }

  // 3. Git Branch (Instant fs resolution)
  if (config.show_git) {
    const git = getGitInfoFast(payload);
    if (git && git.branch) {
      let bName = git.branch;
      if (bName.length > 20 && isNarrow) {
        bName = bName.slice(0, 18) + '…';
      }
      const dirtyMark = git.dirty ? `${c.thinking}*${c.reset}` : '';
      const gitSegment = `${c.git}${glyphs.git} ${c.white}${bName}${dirtyMark}${c.reset}`;

      if (preset === 'pill') {
        line1Parts.push(`${c.bgGit} ${gitSegment} ${c.reset}`);
      } else {
        line1Parts.push(gitSegment);
      }
    }
  }

  // 4. Workspace Folder (Optional)
  if (config.show_workspace) {
    const cwd = (payload && payload.cwd) || process.cwd();
    const folder = path.basename(cwd);
    if (folder) {
      line1Parts.push(`${c.muted}${glyphs.folder} ${folder}${c.reset}`);
    }
  }

  // 5. Active Tasks or Subagents (Only shown when active)
  if (config.show_tasks && payload) {
    const taskCount = payload.task_count || 0;
    const subagents = Array.isArray(payload.subagents) ? payload.subagents.length : (payload.subagents || 0);
    const badges = [];
    if (taskCount > 0) badges.push(`${glyphs.bolt} ${taskCount} task${taskCount > 1 ? 's' : ''}`);
    if (subagents > 0) badges.push(`👥 ${subagents} agent${subagents > 1 ? 's' : ''}`);
    if (badges.length > 0) {
      line1Parts.push(`${c.effort}${badges.join(' ')}${c.reset}`);
    }
  }

  // --- LINE 2: Context Window ("20.5k 20%") + 5h & 7d Quota Limits ---

  // 1. Context Window Usage ("20.5k 20%")
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

    const used = (ctx.total_input_tokens || 0) + (ctx.total_output_tokens || 0);
    const tokenStr = formatTokens(used);
    const pctStr = `${Math.round(pct)}%`;
    const ctxSegment = `${c.white}${tokenStr}${c.reset} ${color}${pctStr}${c.reset}`;

    if (preset === 'pill') {
      line2Parts.push(`${c.bgCtx} ${ctxSegment} ${c.reset}`);
    } else {
      line2Parts.push(ctxSegment);
    }
  }

  // 2. 5h and 7d Quota Limits with Expiry Countdown
  if (config.show_limits !== false) {
    const { b5h, b7d } = parseQuota(payload);
    const q5h = formatQuotaSegment('5h', b5h, preset);
    const q7d = formatQuotaSegment('7d', b7d, preset);
    if (q5h) line2Parts.push(q5h);
    if (q7d) line2Parts.push(q7d);
  }

  // Separator formatting
  let sep = ` ${c.divider}│${c.reset} `;
  if (preset === 'dots') {
    sep = ` ${c.divider}·${c.reset} `;
  } else if (preset === 'compact') {
    sep = ` ${c.divider}|${c.reset} `;
  } else if (preset === 'slash') {
    sep = ` ${c.divider}/${c.reset} `;
  } else if (preset === 'pill') {
    sep = ' ';
  } else if (config.separator) {
    sep = ` ${c.divider}${config.separator}${c.reset} `;
  }

  const line1 = line1Parts.join(sep);
  const line2 = line2Parts.join(sep);

  if (config.multiline && line2Parts.length > 0) {
    return `${line1}\n${line2}`;
  }

  // Single-line fallback if configured
  if (line2Parts.length > 0) {
    return `${line1}${sep}${line2}`;
  }
  return line1;
}

// Interactive Preview Runner
function runPreview(config) {
  const samplePayload = {
    agent_state: 'idle',
    model: {
      id: 'gemini-3.8-flash',
      display_name: 'Gemini 3.8 Flash',
      effort: 'high'
    },
    context_window: {
      used_percentage: 20,
      total_input_tokens: 20100,
      total_output_tokens: 400,
      context_window_size: 102400
    },
    quota: {
      '5h': {
        remaining_fraction: 0.82,
        reset_in_seconds: 13320 // 3h 42m
      },
      '7d': {
        remaining_fraction: 0.65,
        reset_in_seconds: 388800 // 4d 12h
      }
    },
    vcs: {
      type: 'git',
      branch: 'main',
      dirty: false
    },
    cwd: process.cwd(),
    terminal_width: 100
  };

  console.log(`\n${c.bold}✦ Antigravity CLI 2-Line Statusline Preview ✦${c.reset}\n`);
  const presets = ['minimal', 'dots', 'compact', 'slash', 'pill'];
  for (const p of presets) {
    const cfg = { ...config, preset: p };
    console.log(`${c.bold}${p.toUpperCase()}:${c.reset}`);
    const output = renderStatusLine(samplePayload, cfg);
    output.split('\n').forEach(line => console.log(`  ${line}`));
    console.log('');
  }

  console.log(`${c.bold}✦ Agent States (in 'minimal' preset) ✦${c.reset}\n`);
  const states = ['idle', 'thinking', 'working', 'tool_use'];
  for (const st of states) {
    const sPayload = { ...samplePayload, agent_state: st };
    console.log(`${c.bold}${st}:${c.reset}`);
    const output = renderStatusLine(sPayload, { ...config, preset: 'minimal' });
    output.split('\n').forEach(line => console.log(`  ${line}`));
    console.log('');
  }
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

  // Safety fallback if stdin hangs
  const timer = setTimeout(() => {
    if (!input) {
      console.log(`${c.idle}●${c.reset} ${c.white}idle${c.reset} ${c.divider}│${c.reset} ${c.model}Gemini${c.reset}`);
      process.exit(0);
    }
  }, 400);
  timer.unref();

  process.stdin.on('data', chunk => {
    input += chunk;
  });

  process.stdin.on('end', () => {
    clearTimeout(timer);
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
    process.exit(0);
  });
}

main();
