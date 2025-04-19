const { URL } = require('url');

// Parse GitHub URL into owner, repo, branch, and optional initial path
function parseGitHubUrl(repoUrl) {
  let urlObj;
  try { urlObj = new URL(repoUrl); } catch {
    throw new Error('Invalid URL');
  }
  if (urlObj.hostname !== 'github.com') {
    throw new Error('Only github.com URLs are supported');
  }
  const segments = urlObj.pathname.split('/').filter((p) => p);
  const owner = segments[0] || '';
  const repo = segments[1] || '';
  let branch = '';
  let initialPathParts = [];
  if (segments[2] === 'tree' && segments.length >= 4) {
    branch = segments[3];
    initialPathParts = segments.slice(4);
  }
  return { owner, repo, branch, initialPathParts };
}

module.exports = { parseGitHubUrl };