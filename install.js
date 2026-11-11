#!/usr/bin/env node

/**
 * ✦ Antigravity CLI Statusline Installer & Configurator ✦
 * Seamlessly sets up the minimalistic statusline for agy.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n======================================================');
console.log('   ✦ Antigravity CLI Minimalistic Statusline Setup ✦  ');
console.log('======================================================\n');

// 1. Locate ~/.gemini/antigravity-cli directory
const homeDir = process.env.USERPROFILE || process.env.HOME;
if (!homeDir) {
  console.error('❌ Could not locate user home directory.');
  process.exit(1);
}

const agyDir = path.join(homeDir, '.gemini', 'antigravity-cli');
if (!fs.existsSync(agyDir)) {
  fs.mkdirSync(agyDir, { recursive: true });
}

console.log(`[1/4] Antigravity CLI directory: ${agyDir}`);

// 2. Copy statusline files into ~/.gemini/antigravity-cli/
const filesToCopy = [
  'statusline.js',
  'statusline.cmd',
  'statusline.json',
  'statusline.py',
  'statusline.sh'
];

for (const f of filesToCopy) {
  const src = path.join(__dirname, f);
  const dest = path.join(agyDir, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`      ✓ Copied ${f}`);
  }
}

// 3. Resolve space-safe path on Windows
let targetScript = path.join(agyDir, 'statusline.js');
let configuredCommand = '';

if (process.platform === 'win32') {
  try {
    // Get 8.3 short path for user home directory to eliminate spaces in username
    const shortHome = execSync(`cmd /c "for %I in ("${homeDir}") do @echo %~sI"`, {
      encoding: 'utf8'
    }).trim();
    if (shortHome && !shortHome.includes(' ')) {
      const cleanPath = path.join(shortHome, '.gemini', 'antigravity-cli', 'statusline.js');
      configuredCommand = `node ${cleanPath}`;
    } else {
      configuredCommand = `node "${targetScript}"`;
    }
  } catch (e) {
    configuredCommand = `node "${targetScript}"`;
  }
} else {
  configuredCommand = targetScript;
}

console.log(`[2/4] Space-safe command: ${configuredCommand}`);

// 4. Update settings.json
const settingsFile = path.join(agyDir, 'settings.json');
let settings = {};
if (fs.existsSync(settingsFile)) {
  try {
    settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
  } catch (e) {
    settings = {};
  }
}

settings.statusLine = {
  type: 'command',
  command: configuredCommand,
  enabled: true,
  padding: 0,
  stack_with_default: false
};

fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf8');
console.log(`[3/4] Successfully updated settings.json:`);
console.log(`      ${settingsFile}`);

// 5. Test the configured command
console.log(`[4/4] Verifying statusline execution...`);
try {
  const testPayload = JSON.stringify({
    agent_state: 'idle',
    model: { display_name: 'Gemini 3.8 Flash', effort: 'high' },
    context_window: {
      used_percentage: 20,
      total_input_tokens: 20100,
      total_output_tokens: 400
    },
    quota: {
      '5h': { remaining_fraction: 0.82, reset_in_seconds: 13320 },
      '7d': { remaining_fraction: 0.65, reset_in_seconds: 388800 }
    },
    vcs: { branch: 'main' }
  });

  const testOutput = execSync(configuredCommand, {
    input: testPayload,
    encoding: 'utf8'
  }).trim();

  console.log(`\n  Result: ${testOutput}`);
  console.log('\n✨ Done! Your minimalistic statusline is now active in Antigravity CLI.');
  console.log('   Restart agy or type /statusline in your CLI to confirm!\n');
} catch (err) {
  console.error('⚠️ Verification note:', err.message);
}
