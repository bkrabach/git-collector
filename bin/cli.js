#!/usr/bin/env node

const React = require('react');
const { render } = require('ink');
const App = require('../src/app');

function showHelp() {
  console.log(`
git-collector - Interactive GitHub repository file collector

USAGE:
  git-collector [OPTIONS] <destination>

ARGUMENTS:
  <destination>    Path to Markdown data file to create/update
                   Or directory path when using --update

OPTIONS:
  --update         Update existing data file(s) without interactive UI
  --force, -f      Force rewrite even if no changes (with --update)
  --help, -h       Show this help message

EXAMPLES:
  git-collector data.md              # Create new data file (prompts for GitHub URL)
  git-collector --update data.md     # Update existing file
  git-collector --update data/       # Update all files in directory
  git-collector --force --update .   # Force update all files

WORKFLOW:
  1. For new files: You'll be prompted to enter a GitHub repository URL
  2. Interactive UI opens to browse and select files
  3. Selected files are saved to the destination Markdown file

INTERACTIVE CONTROLS:
  ↑/↓       Navigate tree          <space>   Select/deselect
  ←/→       Collapse/expand        <enter>   Preview file
  PgUp/PgDn Page scroll            <tab>     Switch focus
  <s>       Save selections        <x>       Save and quit
  <q>       Quit                   <?>       Help
`);
}

// Parse command-line args: support --update, --force, and --help
const rawArgs = process.argv.slice(2);
let updateMode = false;
let forceMode = false;
const paths = [];
for (const arg of rawArgs) {
  if (arg === '--update') {
    updateMode = true;
  } else if (arg === '--force' || arg === '-f') {
    forceMode = true;
  } else if (arg === '--help' || arg === '-h') {
    showHelp();
    process.exit(0);
  } else {
    paths.push(arg);
  }
}
if (paths.length !== 1) {
  console.error('Usage: git-collector [--update] [--force] <destination>');
  process.exit(1);
}
const destPathArg = paths[0];
const fs = require('fs');
const path = require('path');
const fullDestPath = path.resolve(process.cwd(), destPathArg);
// Utils for update mode
const { fetchContent } = require('../src/utils/githubClient');
const { parseGitHubUrl } = require('../src/utils/urlUtils');

/**
 * Fetch and rewrite a Git Collector data file, unless no changes (unless forced).
 * @param {string} url GitHub repo URL
 * @param {string[]} paths List of file paths to fetch
 * @param {string} destPath Local data file path
 * @param {boolean} [force=false] If true, always rewrite the file (update timestamp)
 */
async function updateDataFile(url, paths, destPath, force = false) {
  // Read existing data file to extract old contents
  const data = fs.readFileSync(destPath, 'utf8');
  const lines = data.split(/\r?\n/);
  const oldContents = {};
  let currPath = null;
  let buffer = [];
  for (const line of lines) {
    const m = line.match(/^=== File: (.*) ===$/);
    if (m) {
      if (currPath) oldContents[currPath] = buffer.join('\n');
      currPath = m[1];
      buffer = [];
    } else if (currPath) {
      buffer.push(line);
    }
  }
  if (currPath) oldContents[currPath] = buffer.join('\n');
  // Start spinner
  const frames = ['-', '\\', '|', '/'];
  let fi = 0;
  const spinner = setInterval(() => {
    process.stdout.write(`\r${frames[fi]} Updating selections...`);
    fi = (fi + 1) % frames.length;
  }, 80);
  // Fetch new contents and compare
  const newContents = {};
  let updated = 0;
  let removed = 0;
  for (const p of paths) {
    try {
      const content = await fetchContent(url, p);
      newContents[p] = content;
      // Normalize old and new for comparison
      const oldC = (oldContents[p] || '').trim().replace(/\r\n/g, '\n');
      const newC = content.trim().replace(/\r\n/g, '\n');
      if (oldC !== newC) updated++;
    } catch {
      removed++;
    }
  }
  // Stop spinner
  clearInterval(spinner);
  process.stdout.write('\r');
  const kept = Object.keys(newContents);
  // If nothing changed and not forced, skip rewriting
  if (!force && updated === 0 && removed === 0) {
    console.log(`No changes in ${destPath}, skipping update.`);
    return;
  }
  // Write updated data file with new header format
  const out = [];
  const { owner, repo, initialPathParts } = parseGitHubUrl(url);
  const title = `${owner}/${repo}${initialPathParts.length ? '/' + initialPathParts.join('/') : ''}`;
  out.push(`# ${title}`);
  out.push('');
  out.push('[git-collector-data]');
  out.push('');
  out.push(`**URL:** ${url}  `);
  out.push(`**Date:** ${new Date().toLocaleString()}  `);
  out.push(`**Files:** ${kept.length}  `);
  out.push('');
  for (const p of kept) {
    out.push(`=== File: ${p} ===`);
    out.push(newContents[p]);
    out.push('');
  }
  fs.writeFileSync(destPath, out.join('\n'), 'utf8');
  // Summary report
  console.log(`Updated data file: ${destPath}`);
  console.log(`Total: ${paths.length}, Updated: ${updated}, Removed: ${removed}`);
}

let repoUrl;
let initialSelections = [];
// If in update mode and destination is a directory, scan for Git Collector data files
if (updateMode && fs.existsSync(fullDestPath) && fs.statSync(fullDestPath).isDirectory()) {
  (async () => {
    const dir = fullDestPath;
    for (const name of fs.readdirSync(dir)) {
      const filePath = path.join(dir, name);
      let stat;
      try {
        stat = fs.statSync(filePath);
      } catch {
        continue;
      }
      if (!stat.isFile()) continue;
      let content;
      try {
        content = fs.readFileSync(filePath, 'utf8');
      } catch {
        continue;
      }
      // Only process files marked as Git Collector data
      if (!content.match(/^\[git-collector-data\]$/m)) continue;
      // Extract URL from metadata
      const urlMatch = content.match(/^\*\*URL:\*\*\s*(.*)$/m);
      if (!urlMatch) {
        console.error(`Skipping ${filePath}: missing URL`);
        continue;
      }
      const url = urlMatch[1].trim();
      const fileMatches = [...content.matchAll(/^=== File:\s*(.*)\s*===$/gm)];
      const paths = fileMatches.map((m) => m[1].trim());
      console.log(`Updating data file: ${filePath}`);
      await updateDataFile(url, paths, filePath, forceMode);
    }
    process.exit(0);
  })();
} else if (fs.existsSync(fullDestPath)) {
  // Load existing data file: parse URL and selected files
  const data = fs.readFileSync(fullDestPath, 'utf8');
  const urlMatch = data.match(/^\*\*URL:\*\*\s*(.*)$/m);
  if (!urlMatch) {
    console.error('Invalid data file: missing URL');
    process.exit(1);
  }
    repoUrl = urlMatch[1].trim();
  // Collect all file paths listed in the data file (=== File: path === separators)
  const fileMatches = [...data.matchAll(/^=== File:\s*(.*)\s*===$/gm)];
  initialSelections = fileMatches.map((m) => m[1].trim());
    if (updateMode) {
      // Update single data file
      updateDataFile(repoUrl, initialSelections, fullDestPath, forceMode);
    } else {
      startApp(repoUrl, initialSelections, fullDestPath);
    }
} else {
  // Prompt user for GitHub URL when creating new data file
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Enter GitHub repository URL: ', (answer) => {
    rl.close();
    repoUrl = answer.trim();
    if (!repoUrl) {
      console.error('Repository URL is required');
      process.exit(1);
    }
    startApp(repoUrl, initialSelections, fullDestPath);
  });
}

/** Mount the Ink application with given parameters */
function startApp(url, initialSelections, destPath) {
  // Prepare stdin for Ink: if not a TTY, wrap in a fake TTY-like stream that passes through data
  let stdin = process.stdin;
  if (!stdin.isTTY) {
    const { PassThrough } = require('stream');
    const fake = new PassThrough();
    fake.isTTY = true;
    // Delegate raw mode toggles to the real stdin if possible
    fake.setRawMode = (mode) => {
      if (typeof process.stdin.setRawMode === 'function') {
        process.stdin.setRawMode(mode);
      }
    };
    process.stdin.pipe(fake);
    stdin = fake;
  }
  // Switch to the alternate terminal buffer (like vim) so the screen is restored on exit
  process.stdout.write('\x1b[?1049h');
  const { waitUntilExit } = render(
    React.createElement(App, { url, initialSelections, destPath }),
    { stdin }
  );
  // On exit, return to the normal buffer
  waitUntilExit().then(() => {
    process.stdout.write('\x1b[?1049l');
  });
}