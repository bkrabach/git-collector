const { toggleSelectionSet } = require('../src/utils/selection');
const { buildTree, getDescendantPaths } = require('../src/utils/tree');

describe('Selection utils', () => {
  test('toggleSelectionSet handles file toggling', () => {
    const entries = [
      { path: 'x.txt', type: 'blob' },
      { path: 'dir/file1.txt', type: 'blob' }
    ];
    const tree = buildTree(entries);
    const nodes = {};
    (function collect(node) {
      nodes[node.path] = node;
      if (node.type === 'tree') node.children.forEach(collect);
    })(tree);

    let sel = new Set();
    sel = toggleSelectionSet(sel, nodes['x.txt'], getDescendantPaths);
    expect(sel.has('x.txt')).toBe(true);
    sel = toggleSelectionSet(sel, nodes['x.txt'], getDescendantPaths);
    expect(sel.has('x.txt')).toBe(false);
  });

  test('toggleSelectionSet handles directory toggling', () => {
    const entries = [
      { path: 'x.txt', type: 'blob' },
      { path: 'dir/file1.txt', type: 'blob' }
    ];
    const tree = buildTree(entries);
    const nodes = {};
    (function collect(node) {
      nodes[node.path] = node;
      if (node.type === 'tree') node.children.forEach(collect);
    })(tree);

    let sel = new Set();
    sel = toggleSelectionSet(sel, nodes['dir'], getDescendantPaths);
    expect(sel.has('dir/file1.txt')).toBe(true);
    sel = toggleSelectionSet(sel, nodes['dir'], getDescendantPaths);
    expect(sel.has('dir/file1.txt')).toBe(false);
  });
});