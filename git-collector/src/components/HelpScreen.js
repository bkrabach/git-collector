const React = require('react');
const { Box, Text, useInput, useStdout } = require('ink');

/**
 * Full-screen help modal. Press any key to dismiss.
 */
function HelpScreen({ onClose }) {
  useInput(() => {
    onClose();
  });
  // Determine terminal size for full-screen overlay
  const { stdout } = useStdout();
  const cols = stdout.columns || 0;
  const rows = stdout.rows || 0;
  const lines = [
    'Git Collector Help',
    '',
    'Navigation:',
    '  <tab>       switch focus between tree and preview',
    '  ↑ / ↓       move cursor up/down',
    '  PgUp / PgDn  page up/down',
    '  ← / →       expand/collapse directory',
    '  <space>     select/deselect file or directory',
    '  <enter>     preview selected file in preview pane',
    '',
    'Actions:',
    '  w           write current selections to data file',
    '  x           write and quit',
    '  q           quit without saving',
    '  h           show this help screen',
    '',
    'Press any key to return.',
  ];
  return React.createElement(
    Box,
    { flexDirection: 'column', width: cols, height: rows, padding: 1 },
    ...lines.map((l, i) => React.createElement(Text, { key: i }, l))
  );
}

module.exports = HelpScreen;