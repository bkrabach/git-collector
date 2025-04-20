const React = require('react');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { getDescendantPaths } = require('../utils/tree');
const { toggleSelectionSet } = require('../utils/selection');

/**
 * Hook to manage selection state and persistence.
 * @param {string} url - Repository URL used to derive storage path.
 * @returns {{
 *   selected: Set<string>,
 *   prevSelected: Set<string>,
 *   toggleSelection: Function,
 *   saveSelection: Function
 * }}
 */
function useSelectionPersistence(url) {
  const [selected, setSelected] = React.useState(new Set());
  const [prevSelected, setPrevSelected] = React.useState(new Set());

  const selectionFilePath = React.useMemo(() => {
    const homedir = os.homedir();
    const baseDir = path.join(homedir, '.git-collector');
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir);
    }
    const filename = url.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.json';
    return path.join(baseDir, filename);
  }, [url]);

  // initial load of persisted selection
  React.useEffect(() => {
    try {
      if (fs.existsSync(selectionFilePath)) {
        const data = JSON.parse(fs.readFileSync(selectionFilePath, 'utf8'));
        if (Array.isArray(data.selected)) {
          const prev = new Set(data.selected);
          setPrevSelected(prev);
          setSelected(new Set(prev));
        }
      }
    } catch {
      // ignore errors
    }
  }, [selectionFilePath]);

  /**
   * Toggle a node's selection (file or directory)
   */
  function toggleSelection(node) {
    setSelected((prev) => toggleSelectionSet(prev, node, getDescendantPaths));
  }

  /**
   * Save selection to file and optionally exit
   */
  function saveSelection(exitFn) {
    const toWrite = { selected: Array.from(selected) };
    fs.writeFileSync(selectionFilePath, JSON.stringify(toWrite, null, 2));
    if (typeof exitFn === 'function') exitFn();
  }

  return { selected, prevSelected, toggleSelection, saveSelection };
}

module.exports = useSelectionPersistence;