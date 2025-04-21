const React = require('react');
const { Box, Text, useInput, useStdout } = require('ink');

// Modal for confirming quit when unsaved changes exist
function QuitConfirmModal({ onCancel, onQuitWithoutSave, onSaveAndQuit }) {
  // Handle confirmation inputs
  useInput((input, key) => {
    if (key.return) {
      onQuitWithoutSave();
    } else if (input === 's') {
      onSaveAndQuit();
    } else if (input === 'c' || key.escape) {
      onCancel();
    }
  });
  // Fullscreen overlay dimensions
  const { stdout } = useStdout();
  const cols = stdout.columns || 0;
  const rows = stdout.rows || 0;
  const contentWidth = Math.min(60, cols - 4);
  const messageLines = [
    'You have unsaved changes.',
    '',
    'Press Enter to quit without saving (default),',
    's to save & quit, or c to cancel.'
  ];
  return React.createElement(
    Box,
    { flexDirection: 'column', width: cols, height: rows, justifyContent: 'center', alignItems: 'center' },
    React.createElement(
      Box,
      { flexDirection: 'column', width: contentWidth, paddingX: 1 },
      ...messageLines.map((line, i) => React.createElement(Text, { key: i }, line))
    )
  );
}

module.exports = QuitConfirmModal;