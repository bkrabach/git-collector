// Build nested tree from flat entries
function buildTree(entries) {
  const root = { name: '', path: '', type: 'tree', children: [], isExpanded: true };
  for (const entry of entries) {
    const parts = entry.path.split('/');
    let current = root;
    let currPath = '';
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      currPath = currPath ? `${currPath}/${name}` : name;
      let child = current.children.find((c) => c.name === name);
      if (!child) {
        const type = i === parts.length - 1 ? entry.type : 'tree';
        child = { name, path: currPath, type, children: [], isExpanded: false };
        current.children.push(child);
      }
      current = child;
    }
  }
  return root;
}

// Sort tree: directories first, then files, alphabetically
function sortTree(node) {
  if (!node.children) return;
  node.children.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'tree' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  node.children.forEach(sortTree);
}

// Flatten tree based on isExpanded flags
function flattenTree(node, depth = 0) {
  const result = [];
  if (depth > 0) result.push({ node, depth });
  if (node.type === 'tree' && node.isExpanded) {
    for (const child of node.children) {
      result.push(...flattenTree(child, depth + 1));
    }
  }
  return result;
}

// Get all selectable descendant file paths of a tree node (excluding itself)
// Only include non-binary, existing blob nodes and recurse into subtrees
function getDescendantPaths(node) {
  if (!node.children || !Array.isArray(node.children)) {
    return [];
  }
  let paths = [];
  for (const child of node.children) {
    // include only real, non-binary files
    if (child.type === 'blob' && !child.missing && !child.isBinary) {
      paths.push(child.path);
    // recurse into directories
    } else if (child.type === 'tree') {
      paths = paths.concat(getDescendantPaths(child));
    }
    // skip phantom or binary blobs and skip directory nodes themselves
  }
  return paths;
}

module.exports = { buildTree, sortTree, flattenTree, getDescendantPaths };