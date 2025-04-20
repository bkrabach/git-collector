const path = require('path');
const { sortTree } = require('./tree');

/**
 * Inject phantom (missing) directories and files into the tree.
 * - Expands any ancestor directories of initial selections.
 * - Inserts missing tree nodes for any ancestor paths not present.
 * - Inserts missing blob nodes for any selected files not present.
 * @param {object} root - The root tree node to mutate.
 * @param {string[]} initialSelections - Previously selected file paths.
 * @returns {object} The mutated tree root.
 */
function mergePhantomNodes(root, initialSelections) {
  // 1) Auto-expand directories containing selected files
  const dirsToExpand = new Set();
  for (const fp of initialSelections) {
    const parts = fp.split('/');
    let prefix = '';
    for (let i = 0; i < parts.length - 1; i++) {
      prefix = prefix ? `${prefix}/${parts[i]}` : parts[i];
      dirsToExpand.add(prefix);
    }
  }
  function expand(node) {
    if (dirsToExpand.has(node.path)) node.isExpanded = true;
    if (node.children) node.children.forEach(expand);
  }
  expand(root);

  // 2) Build a map of existing nodes
  const nodeMap = new Map();
  function buildMap(node) {
    nodeMap.set(node.path, node);
    if (node.type === 'tree' && Array.isArray(node.children)) {
      node.children.forEach(buildMap);
    }
  }
  buildMap(root);

  // 3) Inject phantom ancestor directories and files
  for (const fp of initialSelections) {
    const parts = fp.split('/');
    let prefix = '';
    // Ancestors
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      prefix = prefix ? `${prefix}/${part}` : part;
      if (!nodeMap.has(prefix)) {
        const parentPath = prefix.includes('/') ? prefix.slice(0, prefix.lastIndexOf('/')) : '';
        const parent = parentPath ? nodeMap.get(parentPath) : root;
        const newDir = {
          name: part,
          path: prefix,
          type: 'tree',
          children: [],
          isExpanded: true,
          missing: true
        };
        if (parent && Array.isArray(parent.children)) {
          parent.children.push(newDir);
        }
        nodeMap.set(prefix, newDir);
      }
    }
    // File itself
    if (!nodeMap.has(fp)) {
      const fileName = parts[parts.length - 1];
      const parentPath = parts.length > 1 ? parts.slice(0, parts.length - 1).join('/') : '';
      const parent = parentPath ? nodeMap.get(parentPath) : root;
      const newFile = { name: fileName, path: fp, type: 'blob', missing: true };
      if (parent && Array.isArray(parent.children)) {
        parent.children.push(newFile);
      }
      nodeMap.set(fp, newFile);
    }
  }

  // 4) Sort to position phantoms correctly alongside real nodes
  sortTree(root);
  return root;
}

module.exports = { mergePhantomNodes };