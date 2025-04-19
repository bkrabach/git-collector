const assert = require('assert');
const { parseGitHubUrl } = require('../src/utils/urlUtils');

// Valid URL: repo root
let result = parseGitHubUrl('https://github.com/owner/repo');
assert.strictEqual(result.owner, 'owner');
assert.strictEqual(result.repo, 'repo');
assert.strictEqual(result.branch, '');
assert.deepStrictEqual(result.initialPathParts, []);

// URL with branch and path
result = parseGitHubUrl('https://github.com/owner/repo/tree/feature-branch/dir1/dir2');
assert.strictEqual(result.owner, 'owner');
assert.strictEqual(result.repo, 'repo');
assert.strictEqual(result.branch, 'feature-branch');
assert.deepStrictEqual(result.initialPathParts, ['dir1', 'dir2']);

// Invalid URL
try {
  parseGitHubUrl('not a url');
  assert.fail('Expected error for invalid URL');
} catch (e) {
  assert.strictEqual(e.message, 'Invalid URL');
}

// Unsupported host
try {
  parseGitHubUrl('https://gitlab.com/foo/bar');
  assert.fail('Expected error for unsupported host');
} catch (e) {
  assert.strictEqual(e.message, 'Only github.com URLs are supported');
}

console.log('testUrlUtils passed');