const React = require('react');
const { Box, Text } = require('ink');
const { getDescendantPaths } = require('../utils/tree');

// TreePanel: renders the tree list on the left
function TreePanel({ visible, offset, listHeight, depthOffset, selected, prevSelected, cursor, leftWidth }) {
  const lines = visible.map(({ node, depth }, idx) => {
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
  // pad if list short
  const blankCount = Math.max(0, listHeight - lines.length);
  for (let i = 0; i < blankCount; i++) {
    lines.push(React.createElement(Text, { key: `blank-${i}` }, ''));
  }
  return React.createElement(
    Box,
    { flexDirection: 'column', width: leftWidth, flexShrink: 0, height: listHeight },
    lines
  );
}

module.exports = TreePanel;