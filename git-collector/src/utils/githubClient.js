const { URL } = require('url');
const fetch = require('node-fetch');
const cp = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseGitHubUrl } = require('./urlUtils');

// GitHub token lookup: env vars, gh CLI, then hosts.yml
let ghToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
if (!ghToken) {
  try {
    ghToken = cp.execSync('gh auth token', { encoding: 'utf8' }).trim();
  } catch {}
}
if (!ghToken) {
  try {
    const hostsFile = path.join(os.homedir(), '.config', 'gh', 'hosts.yml');
    if (fs.existsSync(hostsFile)) {
      const lines = fs.readFileSync(hostsFile, 'utf8').split(/\r?\n/);
      let inHost = false;
      for (const line of lines) {
        if (/^github\\.com:/.test(line)) {
          inHost = true;
          continue;
        }
        if (inHost) {
          const m = line.match(/^[ \t]+oauth_token:[ \t]*(\S+)/);
          if (m) {
            ghToken = m[1];
            break;
          }
        }
      }
    }
  } catch {}
}

// In-memory caches for trees and blob contents
const treeCache = new Map();
const contentCache = new Map();

/**
 * Fetch the Git tree for a repo URL, recursive.
 * Caches results per repo+ref.
 * Supports fixture:// URLs for testing.
 */
async function fetchTree(repoUrl, refOverride) {
  // Fixture support
  if (repoUrl.startsWith('fixture://')) {
    const repoName = repoUrl.slice('fixture://'.length);
    const fixturesDir = path.join(__dirname, '../../test/fixtures', repoName);
    const treeFile = path.join(fixturesDir, 'tree.json');
    if (fs.existsSync(treeFile)) {
      return JSON.parse(fs.readFileSync(treeFile, 'utf8'));
    }
    throw new Error(`Fixture tree not found: ${treeFile}`);
  }
  const { owner, repo, branch: urlBranch } = parseGitHubUrl(repoUrl);
  if (!owner || !repo) {
    throw new Error('Invalid GitHub repo URL');
  }
  const ref = refOverride || urlBranch || 'HEAD';
  const cacheKey = `${owner}/${repo}@${ref}`;
  if (treeCache.has(cacheKey)) {
    return treeCache.get(cacheKey);
  }
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`;
  const headers = { 'User-Agent': 'git-collector-cli' };
  if (ghToken) {
    headers['Authorization'] = `token ${ghToken}`;
  }
  const res = await fetch(apiUrl, { headers });
  if (!res.ok) {
    throw new Error(`Failed to fetch repo tree: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  const tree = data.tree;
  treeCache.set(cacheKey, tree);
  return tree;
}

/**
 * Fetch the content of a file in the repo.
 * Caches contents per repo+path.
 * Retrieves via raw.githubusercontent.com for public repos,
 * falls back to GitHub API if raw fetch fails.
 * Supports fixture:// for testing.
 */
async function fetchContent(repoUrl, filePath) {
  // Fixture support
  if (repoUrl.startsWith('fixture://')) {
    const repoName = repoUrl.slice('fixture://'.length);
    const fixturesDir = path.join(__dirname, '../../test/fixtures', repoName, 'files');
    const file = path.join(fixturesDir, filePath);
    if (fs.existsSync(file)) {
      return fs.readFileSync(file, 'utf8');
    }
    throw new Error(`Fixture file not found: ${file}`);
  }
  const cacheKey = `${repoUrl}|${filePath}`;
  if (contentCache.has(cacheKey)) {
    return contentCache.get(cacheKey);
  }
  // Try raw.githubusercontent.com
  try {
    const { owner, repo, branch: urlBranch } = parseGitHubUrl(repoUrl);
    if (!owner || !repo) {
      throw new Error('Invalid GitHub repo URL');
    }
    const branch = urlBranch || 'HEAD';
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
    const res = await fetch(rawUrl);
    if (res.ok) {
      const content = await res.text();
      contentCache.set(cacheKey, content);
      return content;
    }
    // else fall through to API
  } catch {}
  // Fallback to GitHub API
  const { owner, repo, branch: urlBranch } = parseGitHubUrl(repoUrl);
  const apiUrl =
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}` +
    (urlBranch ? `?ref=${urlBranch}` : '');
  const headers = { 'User-Agent': 'git-collector-cli' };
  if (ghToken) {
    headers['Authorization'] = `token ${ghToken}`;
  }
  const res2 = await fetch(apiUrl, { headers });
  if (!res2.ok) {
    throw new Error(`Failed to fetch content: ${res2.status} ${res2.statusText}`);
  }
  const data = await res2.json();
  let content = '';
  if (data.encoding === 'base64' && data.content) {
    content = Buffer.from(data.content, 'base64').toString('utf8');
  } else if (typeof data.content === 'string') {
    content = data.content;
  }
  contentCache.set(cacheKey, content);
  return content;
}

module.exports = { fetchTree, fetchContent };