const React = require('react');
const { Box, Text } = require('ink');
const { getDescendantPaths } = require('../utils/tree');

// TreePanel: renders the tree list on the left
// TreePanel: renders the tree list on the left, with focus header
function TreePanel({ visible, offset, listHeight, depthOffset, selected, prevSelected, cursor, leftWidth, focus }) {
  // reserve two rows: header and border
  const contentHeight = Math.max(0, listHeight - 2);
  const lines = visible.slice(0, contentHeight).map(({ node, depth }, idx) => {
    const globalIdx = offset + idx;
    const isCursor = globalIdx === cursor;
    const isSelected = selected.has(node.path);
    const wasSelected = prevSelected.has(node.path);
    // determine selection mark
    let mark;
    if (node.type === 'tree') {
      const desc = getDescendantPaths(node);
      const selCount = desc.filter((p) => selected.has(p)).length;
      mark = selCount === 0 ? '[ ]' : selCount === desc.length ? '[x]' : '[-]';
    } else {
      mark = isSelected ? '[x]' : '[ ]';
    }
    const indent = ' '.repeat(Math.max(0, depth - depthOffset) * 2);
    const icon = node.type === 'tree' ? (node.isExpanded ? '▼ ' : '▶ ') : '  ';
    const text = `${mark} ${indent}${icon}${node.name}`;
    // reset to default color to avoid bleed from preview panel
    const props = { color: 'white' };
    if (isCursor) props.backgroundColor = 'blue';
    if (isSelected && !wasSelected) props.color = 'green';
    else if (!isSelected && wasSelected) { props.color = 'red'; props.strikethrough = true; }
    else if (isSelected && wasSelected) props.bold = true;
    return React.createElement(Text, { ...props, key: node.path }, text);
  });
  // pad content lines if short
  const blankCount = Math.max(0, contentHeight - lines.length);
  for (let i = 0; i < blankCount; i++) {
    lines.push(React.createElement(Text, { key: `blank-${i}` }, ''));
  }
  // header bar
  const header = React.createElement(
    Box,
    { height: 1, width: leftWidth },
    React.createElement(Text, { color: focus === 'tree' ? 'magenta' : 'white', bold: focus === 'tree' }, ' Files ')
  );
  // border under header
  const border = React.createElement(
    Box,
    { height: 1, width: leftWidth, flexShrink: 0 },
    React.createElement(Text, { color: 'gray' }, '─'.repeat(leftWidth))
  );
  return React.createElement(
    Box,
    { flexDirection: 'column', width: leftWidth, flexShrink: 0, height: listHeight },
    header,
    border,
    ...lines
  );
}

module.exports = TreePanel;