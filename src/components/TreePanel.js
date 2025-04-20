const React = require('react');
const { Box, Text, useInput } = require('ink');
const { handleTreeNav } = require('../hooks/keyboardHandlers');
const { getDescendantPaths } = require('../utils/tree');

// TreePanel: renders the tree list on the left
// TreePanel: renders the tree list on the left, with focus header
function TreePanel({ flattened, listHeight, depthOffset, selected, leftWidth, focus, selectedCount, totalTokens, onToggleSelection, onPreviewFile, setTree }) {
  // reserve two rows: header and border
  const contentHeight = Math.max(0, listHeight - 2);
  // Internal scroll/cursor state for tree
  const [offset, setOffset] = React.useState(0);
  const [cursor, setCursor] = React.useState(0);
  // Handle keyboard when tree has focus
  useInput((input, key) => {
    if (focus !== 'tree') return;
    handleTreeNav(
      { flattened, offset, setOffset, cursor, setCursor, contentHeight, setTree, toggleSelection: onToggleSelection, previewFile: onPreviewFile },
      input,
      key
    );
  }, { isActive: focus === 'tree' });
  // Compute visible slice
  const visible = flattened.slice(offset, offset + contentHeight);
  const lines = visible.map(({ node, depth }, idx) => {
    const globalIdx = offset + idx;
    const isCursor = globalIdx === cursor;
    const indent = ' '.repeat(Math.max(0, depth - depthOffset) * 2);
    const icon = node.type === 'tree' ? (node.isExpanded ? '▼ ' : '▶ ') : '  ';
    // compute selection state
    let mark;
    let isSelected = false;
      let isPartial = false;
    const desc = node.type === 'tree' ? getDescendantPaths(node) : [];
    const selCount = desc.length > 0 ? desc.filter((p) => selected.has(p)).length : 0;
    if (node.type === 'tree') {
      if (selCount === 0) mark = '[ ]';
      else if (selCount === desc.length) { mark = '[x]'; isSelected = true; }
      else { mark = '[-]'; isPartial = true; }
    } else {
      isSelected = selected.has(node.path);
      mark = isSelected ? '[x]' : '[ ]';
    }
    // detect missing phantom or binary entries
    const isMissing = node.missing === true;
    const isBinary = node.isBinary === true;
    const text = `${mark} ${indent}${icon}${node.name}`;
    const props = {};
    if (isMissing) {
      props.color = 'red';
      props.strikethrough = true;
    } else if (isBinary) {
      props.color = 'gray';
    } else if (isPartial) {
      props.color = 'cyan';
    } else if (isSelected) {
      props.color = 'green';
    } else {
      props.color = 'white';
    }
    if (globalIdx === cursor) props.backgroundColor = 'blue';
    return React.createElement(Text, { ...props, key: node.path }, text);
  });
  // pad content lines if short
  const blankCount = Math.max(0, contentHeight - lines.length);
  for (let i = 0; i < blankCount; i++) {
    lines.push(React.createElement(Text, { key: `blank-${i}` }, ''));
  }
  // header bar
  // Header with selected files and total tokens
  const selStr = `${selectedCount} sel`;
  const tokStr = totalTokens >= 1000 ? `${(totalTokens/1000).toFixed(1)}k tok` : `${totalTokens} tok`;
  const header = React.createElement(
    Box,
    { height: 1, width: leftWidth, justifyContent: 'space-between' },
    React.createElement(Text, { color: focus === 'tree' ? 'magenta' : 'white', bold: focus === 'tree' }, ' Files '),
    React.createElement(Text, { color: focus === 'tree' ? 'magenta' : 'white', bold: focus === 'tree' }, ` ${selStr} | ${tokStr} `)
  );
  // border under header
  const border = React.createElement(
    Box,
    { height: 1, width: leftWidth, flexShrink: 0 },
    React.createElement(Text, { color: focus === 'tree' ? 'magenta' : 'gray' }, '─'.repeat(leftWidth))
  );
  return React.createElement(
    Box,
    { flexDirection: 'column', width: leftWidth, flexShrink: 0, height: listHeight },
    header,
    border,
    ...lines
  );
}

module.exports = React.memo(TreePanel);