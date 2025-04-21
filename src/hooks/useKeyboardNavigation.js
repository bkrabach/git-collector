const React = require('react');
const { useInput } = require('ink');

/**
 * Hook to handle keyboard navigation and actions.
 * @param {object} params - Parameters for navigation.
 */
function useKeyboardNavigation(params) {
  const {
    tree,
    focus,
    setFocus,
    onSave,
    onSaveQuit,
    onHelp,
    onQuit,
    exit,
    previewContent
  } = params;

  const { enabled = true } = params;
  useInput(
    (input, key) => {
    // Always allow write, write+quit, quit, or help
      // Always allow write, write+quit, quit, or help
      if (input === 's') {
      onSave();
      return;
      }
      if (input === 'x') {
      onSaveQuit();
      return;
      }
      if (input === 'q') {
      // Quit request: may be intercepted (e.g., unsaved changes)
      if (typeof onQuit === 'function') {
        onQuit();
      } else {
        exit();
      }
      return;
      }
      if (input === '?') {
      // show help screen
      onHelp();
      return;
      }
      if (!tree) return;
      // Switch focus
      if (key.tab) {
        setFocus((f) => {
          if (f === 'tree') return previewContent ? 'preview' : 'tree';
          return 'tree';
        });
        return;
      }
    },
    { isActive: enabled }
  );
}

module.exports = useKeyboardNavigation;