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
  // Fast vertical move via raw Shift (1;2) or Ctrl (1;5) Up/Down sequences: 10% of contentHeight
  if (typeof setOffset === 'function' && typeof setCursor === 'function') {
    const seq = input || '';
    const fastV = Math.max(1, Math.floor(contentHeight * 0.10));
    // fast up
    if (seq.includes('[1;2A') || seq.includes('[1;5A')) {
      const newCursor = Math.max(0, cursor - fastV);
      setCursor(() => newCursor);
      if (newCursor < offset) {
        setOffset(() => newCursor);
      }
      return;
    }
    // fast down
    if (seq.includes('[1;2B') || seq.includes('[1;5B')) {
      const maxCursor = flattened.length - 1;
      const newCursor = Math.min(maxCursor, cursor + fastV);
      setCursor(() => newCursor);
      if (newCursor >= offset + contentHeight) {
        setOffset(() => newCursor - contentHeight + 1);
      }
      return;
    }
  }
  if (key.upArrow || input === 'k') {
    if (cursor > 0) {
      const nc = cursor - 1;
      setCursor(nc);
      if (nc < offset) setOffset(nc);
    }
  } else if (key.downArrow || input === 'j') {
    if (cursor < flattened.length - 1) {
      const nc = cursor + 1;
      setCursor(nc);
      if (nc >= offset + contentHeight) setOffset(offset + 1);
    }
  } else if (key.pageUp || (key.ctrl && input === 'u')) {
    const nc = Math.max(0, cursor - contentHeight);
    setCursor(nc);
    setOffset(Math.max(0, offset - contentHeight));
  } else if (key.pageDown || (key.ctrl && input === 'd')) {
    const nc = Math.min(flattened.length - 1, cursor + contentHeight);
    setCursor(nc);
    const mo = Math.max(0, flattened.length - contentHeight);
    setOffset(Math.min(mo, offset + contentHeight));
  }
  // Fast vertical move via raw Shift/Ctrl Up/Down sequences: 10% of contentHeight
  if (typeof setCursor === 'function' && typeof setOffset === 'function') {
    const seq = input || '';
    const fastV = Math.max(1, Math.floor(contentHeight * 0.10));
    // Move up fast
    if (seq.includes('[1;2A') || seq.includes('[1;5A')) {
      const newCursor = Math.max(0, cursor - fastV);
      setCursor(newCursor);
      if (newCursor < offset) {
        setOffset(newCursor);
      } else if (newCursor >= offset + contentHeight) {
        setOffset(newCursor - contentHeight + 1);
      }
      return;
    }
    // Move down fast
    if (seq.includes('[1;2B') || seq.includes('[1;5B')) {
      const maxCursor = flattened.length - 1;
      const newCursor = Math.min(maxCursor, cursor + fastV);
      setCursor(newCursor);
      if (newCursor < offset) {
        setOffset(newCursor);
      } else if (newCursor >= offset + contentHeight) {
        setOffset(newCursor - contentHeight + 1);
      }
      return;
    }
  }
  // Normal left arrow handling
  if (key.leftArrow || input === 'h') {
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
  } else if (key.rightArrow || input === 'l') {
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
    // Toggle selection only on non-binary, existing blobs
    const { node } = flattened[cursor] || {};
    if (node && node.type === 'blob' && !node.missing && !node.isBinary) {
      toggleSelection(node);
    }
  } else if (key.return) {
    // Expand/collapse tree or preview non-binary blobs
    const { node } = flattened[cursor] || {};
    if (node) {
      if (node.type === 'tree') {
        node.isExpanded = !node.isExpanded;
        setTree((t) => ({ ...t }));
      } else if (!node.missing && !node.isBinary) {
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
  // Fast horizontal scroll via Shift (1;2) or Ctrl (1;5) arrow sequences: 10% of width
  if (typeof setPreviewHOffset === 'function') {
    const fastStep = Math.max(1, Math.floor((typeof width === 'number' ? width : 0) * 0.10));
    const seq = input || '';
    if (seq.includes('[1;2D') || seq.includes('[1;5D')) {
      setPreviewHOffset((h) => Math.max(0, h - fastStep));
      return;
    }
    if (seq.includes('[1;2C') || seq.includes('[1;5C')) {
      setPreviewHOffset((h) => Math.min(maxHOffset, h + fastStep));
      return;
    }
  }
  // Detect Home/End via ink flags or terminal sequences
  if (typeof setPreviewHOffset === 'function') {
    const seq = input || '';
    const isHome = key.home || seq.includes('[H') || seq.includes('OH') || seq.includes('1~');
    const isEnd = key.end || seq.includes('[F') || seq.includes('OF') || seq.includes('4~');
    if (isHome) {
      setPreviewHOffset(() => 0);
      return;
    }
    if (isEnd) {
      setPreviewHOffset(() => maxHOffset);
      return;
    }
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
  // Fast vertical scroll (~10% height) via raw Shift (1;2) or Ctrl (1;5) Up/Down sequences
  if (typeof setPreviewOffset === 'function') {
    const fastV = Math.max(1, Math.floor(contentHeight * 0.10));
    const seqV = input || '';
    if (seqV.includes('[1;2A') || seqV.includes('[1;5A')) {
      setPreviewOffset((o) => Math.max(0, o - fastV));
      return;
    }
    if (seqV.includes('[1;2B') || seqV.includes('[1;5B')) {
      const maxOffFast = Math.max(0, lines.length - contentHeight);
      setPreviewOffset((o) => Math.min(maxOffFast, o + fastV));
      return;
    }
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