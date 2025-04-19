// Integration tests for fetchTree and tree utilities
const { fetchTree } = require('../src/utils/fetchers');
const { buildTree, sortTree, flattenTree } = require('../src/utils/tree');

describe('Integration: fetch and build tree', () => {
  test('fetch fixture tree and verify paths', async () => {
    const treeEntries = await fetchTree('fixture://simple-repo');
    const sorted = treeEntries
      .map(e => ({ path: e.path, type: e.type }))
      .sort((a, b) => a.path.localeCompare(b.path));
    const root = buildTree(sorted);
    sortTree(root);
    const flat = flattenTree(root);
    const paths = flat.map(({ node }) => node.path);
    expect(paths).toContain('a.txt');
    expect(paths).toContain('dir1');
  });
});