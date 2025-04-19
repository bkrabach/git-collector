const React = require('react');
const { Box, Text, useApp, useStdout } = require('ink');
const useRepoTree = require('./hooks/useRepoTree');
const useSelectionPersistence = require('./hooks/useSelectionPersistence');
const usePreview = require('./hooks/usePreview');
const useKeyboardNavigation = require('./hooks/useKeyboardNavigation');
const TreePanel = require('./components/TreePanel');
const PreviewPanel = require('./components/PreviewPanel');
const { getDescendantPaths } = require('./utils/tree');

const App = ({ url }) => {
  // Wrap Ink exit to clear screen before unmounting
  const { exit: inkExit } = useApp();
  // Wrap Ink's exit function; actual screen clearing is handled by the CLI wrapper
  const exit = () => {
    inkExit();
  };
  const { tree, setTree, flattened, error, parsed } = useRepoTree(url);
  const { selected, prevSelected, toggleSelection, saveSelection } = useSelectionPersistence(url);
  const { previewContent, previewTitle, previewOffset, setPreviewOffset, previewFile } = usePreview(url);
  const [offset, setOffset] = React.useState(0);
  const [cursor, setCursor] = React.useState(0);
  const [focus, setFocus] = React.useState('tree');

  // Responsive layout: re-render on terminal resize
  const { stdout } = useStdout();
  const [totalCols, setCols] = React.useState(stdout.columns || 0);
  const [totalRows, setRows] = React.useState(stdout.rows || 0);
  React.useEffect(() => {
    const onResize = () => {
      setCols(stdout.columns || 0);
      setRows(stdout.rows || 0);
    };
    stdout.on('resize', onResize);
    return () => stdout.off('resize', onResize);
  }, [stdout]);
  const controlsHeight = 1;
  const listHeight = Math.max(0, totalRows - controlsHeight - 1);
  const contentHeight = Math.max(0, listHeight - 2);
  const visible = flattened.slice(offset, offset + contentHeight);
  const depthOffset = parsed.initialPathParts.length > 0 ? 1 : 0;

  useKeyboardNavigation({
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
    saveSelection: () => saveSelection(exit),
    exit,
    toggleSelection,
    previewFile,
    previewContent,
    previewOffset,
    setPreviewOffset
  });

  if (error) {
    return React.createElement(Text, { color: 'red' }, 'Error: ' + error);
  }
  if (!tree) {
    return React.createElement(Text, null, 'Loading repository tree...');
  }

  const leftLines = flattened.map(({ node, depth }) => {
    let mark;
    if (node.type === 'tree') {
      const desc = getDescendantPaths(node);
      const selCount = desc.filter((p) => selected.has(p)).length;
      mark = selCount === 0 ? '[ ]' : selCount === desc.length ? '[x]' : '[-]';
    } else {
      mark = selected.has(node.path) ? '[x]' : '[ ]';
    }
    const indent = ' '.repeat(Math.max(0, depth - depthOffset) * 2);
    const icon = node.type === 'tree' ? (node.isExpanded ? '▼ ' : '▶ ') : '  ';
    return `${mark} ${indent}${icon}${node.name}`;
  });
  // Compute left panel width but clamp to non-negative value
  const rawLeft = Math.min(totalCols - 1, leftLines.reduce((m, l) => Math.max(m, l.length), 0));
  const leftWidth = Math.max(0, rawLeft);

  return React.createElement(
    Box,
    { flexDirection: 'column', height: totalRows },
    React.createElement(
      Box,
      { flexDirection: 'row', height: listHeight },
      React.createElement(TreePanel, {
        visible,
        offset,
        listHeight,
        depthOffset,
        selected,
        prevSelected,
        cursor,
        leftWidth,
        focus
      }),
      React.createElement(
        Box,
        { flexDirection: 'column', width: 3, height: listHeight, flexShrink: 0 },
        ...Array(listHeight).fill(null).map((_, i) =>
          React.createElement(Text, { key: `sep-${i}`, color: 'gray' }, ' │ ')
        )
      ),
      React.createElement(PreviewPanel, {
        previewContent,
        previewTitle,
        listHeight,
        previewOffset,
        focus,
        // Ensure non-negative width to avoid repeat(-n) errors
        width: Math.max(0, totalCols - leftWidth - 3)
      })
    ),
    React.createElement(
      Box,
      { height: 1, width: totalCols, flexShrink: 0 },
      React.createElement(Text, { color: 'gray' }, '─'.repeat(totalCols))
    ),
    React.createElement(
      Box,
      { height: controlsHeight, width: totalCols, flexShrink: 0, backgroundColor: 'gray' },
      React.createElement(Text, { color: 'whiteBright' }, 'Controls: ↑/↓ navigate, PgUp/PgDn page, ←/→ expand/collapse, space select, s save&quit, q quit')
    )
  );
};

module.exports = App;
