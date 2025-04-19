const { parseGitHubUrl } = require('../src/utils/urlUtils');

describe('parseGitHubUrl', () => {
  test('valid URL: repo root', () => {
    const result = parseGitHubUrl('https://github.com/owner/repo');
    expect(result.owner).toBe('owner');
    expect(result.repo).toBe('repo');
    expect(result.branch).toBe('');
    expect(result.initialPathParts).toEqual([]);
  });

  test('URL with branch and path', () => {
    const result = parseGitHubUrl('https://github.com/owner/repo/tree/feature-branch/dir1/dir2');
    expect(result.owner).toBe('owner');
    expect(result.repo).toBe('repo');
    expect(result.branch).toBe('feature-branch');
    expect(result.initialPathParts).toEqual(['dir1', 'dir2']);
  });

  test('invalid URL', () => {
    expect(() => parseGitHubUrl('not a url')).toThrow('Invalid URL');
  });

  test('unsupported host', () => {
    expect(() => parseGitHubUrl('https://gitlab.com/foo/bar')).toThrow('Only github.com URLs are supported');
  });
});