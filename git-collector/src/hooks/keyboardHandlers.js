/**
 * Helper functions for keyboard navigation handling.
 */
function handleTreeNav(params, input, key) {
  const {
    flattened,
    offset,
    setOffset,
    cursor,
    setCursor,
    contentHeight,
    setTree,
    toggleSelection,
    previewFile
  } = params;
  if (key.upArrow) {
    if (cursor > 0) {
      const nc = cursor - 1;
      setCursor(nc);
      if (nc < offset) setOffset(nc);
    }
  } else if (key.downArrow) {
    if (cursor < flattened.length - 1) {
      const nc = cursor + 1;
      setCursor(nc);
      if (nc >= offset + contentHeight) setOffset(offset + 1);
    }
  } else if (key.pageUp) {
    const nc = Math.max(0, cursor - contentHeight);
    setCursor(nc);
    setOffset(Math.max(0, offset - contentHeight));
  } else if (key.pageDown) {
    const nc = Math.min(flattened.length - 1, cursor + contentHeight);
    setCursor(nc);
    const mo = Math.max(0, flattened.length - contentHeight);
    setOffset(Math.min(mo, offset + contentHeight));
  } else if (key.leftArrow) {
    const { node, depth } = flattened[cursor] || {};
    if (node && node.type === 'tree' && node.isExpanded) {
      node.isExpanded = false;
      setTree((t) => ({ ...t }));
    } else if (depth > 1) {
      for (let i = cursor - 1; i >= 0; i--) {
        if (flattened[i].depth === depth - 1) {
          setCursor(i);
          if (i < offset) setOffset(i);
          break;
        }
      }
    }
  } else if (key.rightArrow) {
    const { node } = flattened[cursor] || {};
    if (node && node.type === 'tree' && !node.isExpanded) {
      node.isExpanded = true;
      setTree((t) => ({ ...t }));
    } else if (node && node.type === 'tree' && node.isExpanded && node.children.length) {
      const nc = cursor + 1;
      setCursor(nc);
      if (nc >= offset + contentHeight) setOffset(offset + 1);
    }
  } else if (input === ' ') {
    const { node } = flattened[cursor] || {};
    if (node && !node.missing) toggleSelection(node);
  } else if (key.return) {
    const { node } = flattened[cursor] || {};
    if (node) {
      if (node.type === 'tree') {
        node.isExpanded = !node.isExpanded;
        setTree((t) => ({ ...t }));
      } else {
        previewFile(node);
      }
    }
  }
}

function handlePreviewNav(params, input, key) {
  const {
    previewContent,
    previewOffset,
    setPreviewOffset,
    contentHeight,
    width,
    setPreviewHOffset
  } = params;
  const lines = previewContent.split(/\r?\n/);
  // Compute maximum horizontal offset based on longest line
  const maxLineLen = lines.reduce((max, l) => Math.max(max, l.length), 0);
  const maxHOffset = Math.max(0, maxLineLen - (typeof width === 'number' ? width : 0));
  // Home/End keys (with fallback raw sequences)
  if (typeof setPreviewHOffset === 'function' && (key.home || input === '\x1b[H' || input === '\x1b[1~')) {
    setPreviewHOffset(() => 0);
    return;
  }
  if (typeof setPreviewHOffset === 'function' && (key.end || input === '\x1b[F' || input === '\x1b[4~')) {
    setPreviewHOffset(() => maxHOffset);
    return;
  }
  // Horizontal scroll
  if (key.leftArrow && typeof setPreviewHOffset === 'function') {
    setPreviewHOffset((h) => Math.max(0, h - 1));
    return;
  }
  if (key.rightArrow && typeof setPreviewHOffset === 'function') {
    setPreviewHOffset((h) => Math.min(maxHOffset, h + 1));
    return;
  }
  // Vertical scroll
  if (key.upArrow) {
    setPreviewOffset((o) => Math.max(0, o - 1));
    return;
  }
  if (key.downArrow) {
    const maxOff = Math.max(0, lines.length - contentHeight);
    setPreviewOffset((o) => Math.min(maxOff, o + 1));
    return;
  }
  if (key.pageUp) {
    setPreviewOffset((o) => Math.max(0, o - contentHeight));
    return;
  }
  if (key.pageDown) {
    const maxOff = Math.max(0, lines.length - contentHeight);
    setPreviewOffset((o) => Math.min(maxOff, o + contentHeight));
    return;
  }
}

module.exports = { handleTreeNav, handlePreviewNav };