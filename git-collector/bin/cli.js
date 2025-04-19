#!/usr/bin/env node

const React = require('react');
const { render } = require('ink');
const App = require('../src/app');

const [, , destPathArg] = process.argv;
if (!destPathArg) {
  console.error('Usage: git-collector <destination-markdown-file>');
  process.exit(1);
}
const fs = require('fs');
const path = require('path');
const fullDestPath = path.resolve(process.cwd(), destPathArg);

let repoUrl;
let initialSelections = [];
if (fs.existsSync(fullDestPath)) {
  // Load existing data file: parse URL and selected files
  const data = fs.readFileSync(fullDestPath, 'utf8');
  const urlMatch = data.match(/^URL:\s*(.*)$/m);
  if (!urlMatch) {
    console.error('Invalid data file: missing URL');
    process.exit(1);
  }
  repoUrl = urlMatch[1].trim();
  // Collect all file paths listed in the data file (=== File: path === separators)
  const fileMatches = [...data.matchAll(/^=== File:\s*(.*)\s*===$/gm)];
  initialSelections = fileMatches.map((m) => m[1].trim());
  startApp(repoUrl, initialSelections, fullDestPath);
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
  // Prepare stdin for Ink: if not a TTY, create a fake TTY-like stream
  let stdin = process.stdin;
  if (!stdin.isTTY) {
    const { Readable } = require('stream');
    const fake = new Readable({ read() {} });
    fake.isTTY = true;
    fake.setRawMode = () => {};
    stdin = fake;
  }
  // Render the Ink app and clear screen & scrollback after exit
  const { waitUntilExit } = render(
    React.createElement(App, { url, initialSelections, destPath }),
    { stdin }
  );
  waitUntilExit().then(() => {
    process.stdout.write('\x1b[2J\x1b[3J\x1b[H');
  });
}