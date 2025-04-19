const assert = require('assert');
const {
  buildTree,
  sortTree,
  flattenTree,
  getDescendantPaths
} = require('../src/utils/tree');

// Prepare entries with files and a directory
const entries = [
  { path: 'b.txt', type: 'blob' },
  { path: 'a.txt', type: 'blob' },
  { path: 'dir1/file1.txt', type: 'blob' }
];
// Build and sort tree
const root = buildTree(entries);
sortTree(root);
// Flatten tree
const flat = flattenTree(root);
// Expect three items: 'dir1', 'a.txt', 'b.txt'
assert.strictEqual(flat.length, 3, 'Expected 3 items in flat tree');
assert.strictEqual(flat[0].node.name, 'dir1');
assert.strictEqual(flat[0].depth, 1);
assert.strictEqual(flat[1].node.name, 'a.txt');
assert.strictEqual(flat[2].node.name, 'b.txt');

// Expand directory and test descendant paths
const dirNode = root.children.find((c) => c.name === 'dir1');
let desc = getDescendantPaths(dirNode);
assert.deepStrictEqual(desc, ['dir1/file1.txt']);

console.log('testTree passed');