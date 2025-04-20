const React = require('react');
const { useInput } = require('ink');
const { handleTreeNav, handlePreviewNav } = require('./keyboardHandlers');

/**
 * Hook to handle keyboard navigation and actions.
 * @param {object} params - Parameters for navigation.
 */
function useKeyboardNavigation(params) {
  const {
    tree,
    flattened,
    offset,
    setOffset,
    cursor,
    setCursor,
    contentHeight,
    setTree,
    focus,
    setFocus,
    onSave,
    onSaveQuit,
    onHelp,
    exit,
    toggleSelection,
    previewFile,
    previewContent,
    previewOffset,
    setPreviewOffset
  } = params;

  const { enabled = true } = params;
  useInput(
    (input, key) => {
    // Always allow write, write+quit, quit, or help
      // Always allow write, write+quit, quit, or help
      if (input === 'w') {
      onSave();
      return;
      }
      if (input === 'x') {
      onSaveQuit();
      return;
      }
      if (input === 'q') {
      exit();
      return;
      }
      if (input === 'h') {
      // show help screen
      onHelp();
      return;
      }
      if (!tree) return;
      // Switch focus
      if (key.tab) {
        // Switch focus: only enter preview if content is loaded
        setFocus((f) => {
          if (f === 'tree') {
            return previewContent ? 'preview' : 'tree';
          }
          return 'tree';
        });
        return;
      }
      if (focus === 'tree') {
        handleTreeNav(params, input, key);
      } else {
        handlePreviewNav(params, input, key);
      }
    },
    { isActive: enabled }
  );
}

module.exports = useKeyboardNavigation;