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
  // Fast vertical scroll (~10% of content) via raw Shift (1;2) or Ctrl (1;5) Up/Down sequences
  if (typeof setOffset === 'function') {
    const seq = input || '';
    const fastV = Math.max(1, Math.floor(contentHeight * 0.10));
    const maxOffset = Math.max(0, flattened.length - contentHeight);
    if (seq.includes('[1;2A') || seq.includes('[1;5A')) {
      // scroll up fast
      setOffset((o) => Math.max(0, o - fastV));
      setCursor((c) => Math.max(0, c - fastV));
      return;
    }
    if (seq.includes('[1;2B') || seq.includes('[1;5B')) {
      // scroll down fast
      setOffset((o) => Math.min(maxOffset, o + fastV));
      setCursor((c) => Math.min(flattened.length - 1, c + fastV));
      return;
    }
  }
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