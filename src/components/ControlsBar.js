const React = require('react');
const { Box, Text } = require('ink');

/**
 * ControlsBar: static bar at bottom showing available key commands.
 * Rerenders only when controlsItems, width, or height change.
 */
function ControlsBar({ controlsItems, totalCols, controlsHeight }) {
  const children = controlsItems.map((item, idx) => {
    // Split key and rest
    const match = item.match(/^([^ ]+)/);
    const keyPart = match ? match[1] : '';
    const rest = match ? item.slice(keyPart.length) : item;
    const fragments = [];
    if (keyPart) {
      const segs = keyPart.split('/');
      segs.forEach((seg, i) => {
        fragments.push(React.createElement(Text, { color: 'magenta', key: `key-${idx}-${i}` }, seg));
        if (i < segs.length - 1) {
          fragments.push(React.createElement(Text, { color: 'white', key: `slash-${idx}-${i}` }, '/'));
        }
      });
    }
    fragments.push(React.createElement(Text, { color: 'white', key: `rest-${idx}` }, rest));
    if (idx < controlsItems.length - 1) {
      fragments.push(React.createElement(Text, { color: 'white', key: `sep-${idx}` }, ' | '));
    }
    return React.createElement(Box, { key: idx, wrap: 'truncate', flexShrink: 0, flexDirection: 'row' }, ...fragments);
  });
  return React.createElement(
    Box,
    { height: controlsHeight, width: totalCols, flexShrink: 0, backgroundColor: 'gray', flexDirection: 'row', alignItems: 'center' },
    ...children
  );
}

module.exports = React.memo(ControlsBar);