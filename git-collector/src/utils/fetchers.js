const fetch = require('node-fetch');
const { URL } = require('url');
const cp = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

/*
 * GitHub token lookup is intentionally robust:
 *   1. Environment variables: GITHUB_TOKEN or GH_TOKEN
 *   2. Fallback to `gh auth token` via GitHub CLI
 *   3. Fallback to oauth_token in ~/.config/gh/hosts.yml
 */
let ghToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
if (!ghToken) {
  try {
    ghToken = cp.execSync('gh auth token', { encoding: 'utf8' }).trim();
  } catch {
    ghToken = null;
  }
}
// Fallback: parse ~/.config/gh/hosts.yml for oauth_token under github.com
if (!ghToken) {
  try {
    const hostsFile = path.join(os.homedir(), '.config', 'gh', 'hosts.yml');
    if (fs.existsSync(hostsFile)) {
      const content = fs.readFileSync(hostsFile, 'utf8');
      const lines = content.split(/\r?\n/);
      let inHost = false;
      for (const line of lines) {
        if (/^github\.com:/.test(line)) { inHost = true; continue; }
        if (inHost) {
          const m = line.match(/^[ \t]+oauth_token:[ \t]*(\S+)/);
          if (m) { ghToken = m[1]; break; }
        }
      }
    }
  } catch {}
}

// Fetch the Git tree recursively, supporting branch override
async function fetchTree(repoUrl, refOverride) {
  // Fixture support: load from test fixtures when URL starts with fixture://
  if (repoUrl.startsWith('fixture://')) {
    const repoName = repoUrl.slice('fixture://'.length);
    const fixturesDir = path.join(__dirname, '../../test/fixtures', repoName);
    const treeFile = path.join(fixturesDir, 'tree.json');
    if (fs.existsSync(treeFile)) {
      return JSON.parse(fs.readFileSync(treeFile, 'utf8'));
    }
    throw new Error(`Fixture tree not found: ${treeFile}`);
  }
  let urlObj;
  try { urlObj = new URL(repoUrl); } catch {
    throw new Error('Invalid URL');
  }
  if (urlObj.hostname !== 'github.com') {
    throw new Error('Only github.com URLs are supported');
  }
  const parts = urlObj.pathname.split('/').filter((p) => p);
  const [owner, repo] = parts;
  if (!owner || !repo) {
    throw new Error('Invalid GitHub repo URL');
  }
  let ref = 'HEAD';
  if (refOverride) {
    ref = refOverride;
  } else if (parts[2] === 'tree' && parts[3]) {
    ref = parts[3];
  }
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`;
  // Prepare headers, optionally include GitHub token for higher rate limits
  const headers = { 'User-Agent': 'git-collector-cli' };
  if (ghToken) headers['Authorization'] = `token ${ghToken}`;
  const res = await fetch(apiUrl, { headers });
  if (!res.ok) {
    throw new Error(`Failed to fetch repo tree: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return data.tree;
}

// Fetch file content via GitHub contents API
async function fetchContent(repoUrl, filePath) {
  // Fixture support: load from test fixtures when URL starts with fixture://
  if (repoUrl.startsWith('fixture://')) {
    const repoName = repoUrl.slice('fixture://'.length);
    const fixturesDir = path.join(__dirname, '../../test/fixtures', repoName, 'files');
    const file = path.join(fixturesDir, filePath);
    if (fs.existsSync(file)) {
      return fs.readFileSync(file, 'utf8');
    }
    throw new Error(`Fixture file not found: ${file}`);
  }
  let urlObj;
  try { urlObj = new URL(repoUrl); } catch {
    throw new Error('Invalid URL');
  }
  const parts = urlObj.pathname.split('/').filter((p) => p);
  const [owner, repo] = parts;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const headers = { 'User-Agent': 'git-collector-cli' };
  if (ghToken) headers['Authorization'] = `token ${ghToken}`;
  const res = await fetch(apiUrl, { headers });
  if (!res.ok) {
    throw new Error(`Failed to fetch content: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  let content = '';
  if (data.encoding === 'base64' && data.content) {
    content = Buffer.from(data.content, 'base64').toString('utf8');
  } else if (typeof data.content === 'string') {
    content = data.content;
  }
  return content;
}

module.exports = { fetchTree, fetchContent };