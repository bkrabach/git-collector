#!/usr/bin/env node

const React = require('react');
const { render } = require('ink');
const App = require('../src/app');

const [, , repoUrl] = process.argv;
if (!repoUrl) {
  console.error('Usage: git-collector <github-repo-url>');
  process.exit(1);
}

// When piped or redirected, stdin.isTTY may be false and Ink raw mode will error.
// Stub a TTY-like stdin with no-op setRawMode to disable raw mode when not supported.
let stdin = process.stdin;
if (!stdin.isTTY) {
  const { Readable } = require('stream');
  const fake = new Readable({ read() {} });
  fake.isTTY = true;
  fake.setRawMode = () => {};
  stdin = fake;
}
// Render the Ink app and clear screen after it exits
const { waitUntilExit } = render(
  React.createElement(App, { url: repoUrl }),
  { stdin }
);
// Once the Ink app finishes, clear screen & scrollback, then move cursor home
waitUntilExit().then(() => {
  // Clear screen, clear scrollback, then move cursor home
  process.stdout.write('\x1b[2J\x1b[3J\x1b[H');
});