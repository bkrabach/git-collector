/**
 * Toggle selection for a node (file or directory) returning a new Set.
 * @param {Set<string>} selected - current selection set of file paths
 * @param {{ type: string, path: string }} node - node to toggle
 * @param {function} getDescendantPaths - function to get descendant paths for directory
 * @returns {Set<string>} new selection set
 */
function toggleSelectionSet(selected, node, getDescendantPaths) {
  const newSel = new Set(selected);
  if (node.type === 'tree') {
    const desc = getDescendantPaths(node);
    const allSel = desc.every((p) => newSel.has(p));
    if (allSel) desc.forEach((p) => newSel.delete(p));
    else desc.forEach((p) => newSel.add(p));
  } else {
    if (newSel.has(node.path)) newSel.delete(node.path);
    else newSel.add(node.path);
  }
  return newSel;
}

module.exports = { toggleSelectionSet };