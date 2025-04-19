const {
  buildTree,
  sortTree,
  flattenTree,
  getDescendantPaths
} = require('../src/utils/tree');

describe('Tree utils', () => {
  test('flatten tree yields correct nodes and order', () => {
    const entries = [
      { path: 'b.txt', type: 'blob' },
      { path: 'a.txt', type: 'blob' },
      { path: 'dir1/file1.txt', type: 'blob' }
    ];
    const root = buildTree(entries);
    sortTree(root);
    const flat = flattenTree(root);
    expect(flat).toHaveLength(3);
    expect(flat[0].node.name).toBe('dir1');
    expect(flat[1].node.name).toBe('a.txt');
    expect(flat[2].node.name).toBe('b.txt');
  });

  test('getDescendantPaths returns correct paths', () => {
    const entries = [{ path: 'dir1/file1.txt', type: 'blob' }];
    const root = buildTree(entries);
    const dirNode = root.children.find(c => c.name === 'dir1');
    const desc = getDescendantPaths(dirNode);
    expect(desc).toEqual(['dir1/file1.txt']);
  });
});