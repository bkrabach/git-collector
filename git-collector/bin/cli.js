#!/usr/bin/env node

const React = require('react');
const { render } = require('ink');
const App = require('../src/app');

const [, , repoUrl] = process.argv;
if (!repoUrl) {
  console.error('Usage: git-collector <github-repo-url>');
  process.exit(1);
}

render(React.createElement(App, { url: repoUrl }));