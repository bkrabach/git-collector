const { URL } = require('url');

// Parse GitHub URL (or shorthand owner/repo[/path...]) into owner, repo, branch, and optional initial path
function parseGitHubUrl(repoUrl) {
  // Allow fixture:// URLs for testing without GitHub parsing
  if (repoUrl.startsWith('fixture://')) {
    return { owner: '', repo: '', branch: '', initialPathParts: [] };
  }
  // Normalize shorthand GitHub repository references to full URL
  let normalized = repoUrl;
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(normalized);
  if (!hasScheme) {
    if (normalized.startsWith('github.com/')) {
      normalized = 'https://' + normalized;
    } else if (/^[^\/\s]+\/[^\/\s]+(\/.*)?$/.test(normalized)) {
      normalized = 'https://github.com/' + normalized;
    }
  }
  let urlObj;
  try {
    urlObj = new URL(normalized);
  } catch {
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
  } else if (segments.length > 2) {
    // Treat any additional path segments as initial path (shorthand without explicit tree)
    initialPathParts = segments.slice(2);
  }
  return { owner, repo, branch, initialPathParts };
}

module.exports = { parseGitHubUrl };