const React = require('react');
const { Box, Text, useApp, useStdout } = require('ink');
const { mergePhantomNodes } = require('./utils/phantomTree');
const useRepoTree = require('./hooks/useRepoTree');
// Utilities for tree manipulation
const { getDescendantPaths } = require('./utils/tree');
const usePreview = require('./hooks/usePreview');
const useKeyboardNavigation = require('./hooks/useKeyboardNavigation');
const TreePanel = require('./components/TreePanel');
const PreviewPanel = require('./components/PreviewPanel');
// Status indicator for loading/saving
const StatusIndicator = require('./components/StatusIndicator');
const { toggleSelectionSet } = require('./utils/selection');
const { fetchContent } = require('./utils/githubClient');

const App = ({ url, initialSelections = [], destPath }) => {
  // Wrap Ink exit to clear screen before unmounting
  const { exit: inkExit } = useApp();
  // Wrap Ink's exit function; actual screen clearing is handled by the CLI wrapper
  const exit = () => {
    inkExit();
  };
  const { tree, setTree, flattened, error, parsed } = useRepoTree(url);
  // State for showing help modal
  const [showHelp, setShowHelp] = React.useState(false);
  // UI state
  const [isSaving, setIsSaving] = React.useState(false);
  // Message for status indicator
  const [savingMsg, setSavingMsg] = React.useState('');
  // Initialize selection state
  const [selected, setSelected] = React.useState(() => new Set(initialSelections));
  // On initial load, expand all directories that contain selected files
  // Merge phantom nodes (missing files/ancestors) into the tree once
  const [merged, setMerged] = React.useState(false);
  React.useEffect(() => {
    if (!merged && tree) {
      setMerged(true);
      const newTree = mergePhantomNodes(tree, initialSelections);
      setTree({ ...newTree });
    }
  }, [tree, initialSelections, setTree, merged]);
  const toggleSelection = (node) => setSelected((prev) => toggleSelectionSet(prev, node, getDescendantPaths));
  const { writeSelections } = require('./utils/writeSelections');
  // Core write logic: serialize and write selected files, then call exitFn
  const writeSelection = (exitFn) => {
    (async () => {
      await writeSelections({ url, destPath, selected, flattened });
      exitFn();
    })();
  };
  // Handlers for write and write&quit
  const onSave = () => {
    setSavingMsg('Saving...');
    setIsSaving(true);
    writeSelection(() => setIsSaving(false));
  };
  const onSaveQuit = () => {
    setSavingMsg('Saving and exiting...');
    setIsSaving(true);
    writeSelection(exit);
  };
  const { previewContent, previewTitle, previewOffset, setPreviewOffset, previewFile } = usePreview(url);
  const [previewHOffset, setPreviewHOffset] = React.useState(0);
  // Wrap previewFile to reset both vertical and horizontal scrolls when loading new file
  const previewFileWrapped = (node) => {
    setPreviewOffset(0);
    setPreviewHOffset(0);
    previewFile(node);
  };
  const [offset, setOffset] = React.useState(0);
  const [cursor, setCursor] = React.useState(0);
  const [focus, setFocus] = React.useState('tree');
  // Track token counts for selected files
  const [tokenCounts, setTokenCounts] = React.useState({});
  // Initialize js-tiktoken encoder
  const { Tiktoken } = require('js-tiktoken/lite');
  const o200k_base = require('js-tiktoken/ranks/o200k_base');
  const encoder = React.useMemo(() => new Tiktoken(o200k_base), []);
  // Fetch token counts on selection changes
  React.useEffect(() => {
    selected.forEach((path) => {
      if (!(path in tokenCounts)) {
        // fetch content and count tokens
        fetchContent(url, path)
          .then((content) => {
            const count = encoder.encode(content).length;
            setTokenCounts((prev) => ({ ...prev, [path]: count }));
          })
          .catch(() => {});
      }
    });
  }, [selected, tokenCounts, url, encoder]);
  const selectedCount = selected.size;
  const totalTokens = Array.from(selected).reduce(
    (sum, p) => sum + (tokenCounts[p] || 0),
    0
  );

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
  // Visible slice from flattened tree
  const visible = flattened.slice(offset, offset + contentHeight);
  const depthOffset = parsed.initialPathParts.length > 0 ? 1 : 0;
  // Build and fit control items based on focus and available width
  const controlsItems = React.useMemo(() => {
    // Base control spec
    const base = [
      '<tab> switch focus',
      '↑/↓ navigate',
      'PgUp/PgDn page',
      '←/→ expand/collapse',
      '<space> select',
      '<enter> preview',
      '<w> write',
      '<x> write & quit',
      '<q> quit'
    ];
    // Filter per focus
    let items = base;
    if (focus === 'preview') {
      items = items
        .filter((i) => !i.startsWith('<space') && !i.startsWith('<enter'))
        .map((i) => i.replace('navigate', 'scroll').replace('expand/collapse', 'scroll'));
    }
    if (!previewContent) {
      items = items.filter((i) => !i.startsWith('<tab'));
    }
    // Fit to available width
    const helpItem = '<h> help';
    const header = 'Controls:';
    let avail = totalCols - header.length - 1;
    const shown = [];
    for (const item of items) {
      const segLen = item.length + (shown.length > 0 ? 3 : 0);
      if (avail >= segLen) {
        shown.push(item);
        avail -= segLen;
      } else break;
    }
    // Always append help if space
    const helpSeg = helpItem.length + (shown.length > 0 ? 3 : 0);
    if (avail >= helpSeg) shown.push(helpItem);
    return shown;
  }, [focus, previewContent, totalCols]);

  // Compute left panel width to determine preview panel width
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
  const rawLeft = Math.min(totalCols - 1, leftLines.reduce((m, l) => Math.max(m, l.length), 0));
  const leftWidth = Math.max(0, rawLeft);
  const panelWidth = Math.max(0, totalCols - leftWidth - 3);
  useKeyboardNavigation({
    // Disable keyboard nav while help screen is displayed
    enabled: !showHelp,
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
    onHelp: () => setShowHelp(true),
    exit,
    toggleSelection,
    previewFile: previewFileWrapped,
    previewContent,
    previewOffset,
    setPreviewOffset,
    previewHOffset,
    setPreviewHOffset,
    width: panelWidth
  });

  if (error) {
    return React.createElement(Text, { color: 'red' }, 'Error: ' + error);
  }
  if (!tree) {
    return React.createElement(Text, null, 'Loading repository tree...');
  }
  // Show full-screen help modal if requested
  if (showHelp) {
    const HelpScreen = require('./components/HelpScreen');
    return React.createElement(HelpScreen, { onClose: () => setShowHelp(false), focus });
  }

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
        cursor,
        leftWidth,
        focus,
        selectedCount,
        totalTokens
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
        previewHOffset,
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
    // Status indicator (e.g. saving animation)
    isSaving && React.createElement(StatusIndicator, { message: savingMsg }),
    React.createElement(
      Box,
      { height: controlsHeight, width: totalCols, flexShrink: 0, backgroundColor: 'gray', flexDirection: 'row', alignItems: 'center' },
      controlsItems.map((item, idx) => {
        // Split first token (key) from rest
        const match = item.match(/^(\S+)/);
        const keyPart = match ? match[1] : '';
        const rest = match ? item.slice(keyPart.length) : item;
        // Render keyPart with slash in white, key chars in magenta
        const fragments = [];
        if (keyPart) {
          const segs = keyPart.split('/');
          segs.forEach((seg, i) => {
            fragments.push(React.createElement(Text, { color: 'magenta', key: `key-${idx}-${i}` }, seg));
            if (i < segs.length - 1) fragments.push(React.createElement(Text, { color: 'white', key: `slash-${idx}-${i}` }, '/'));
          });
        }
        fragments.push(React.createElement(Text, { color: 'white', key: `rest-${idx}` }, rest));
        if (idx < controlsItems.length - 1) fragments.push(React.createElement(Text, { color: 'white', key: `sep-${idx}` }, ' | '));
        return React.createElement(Box, { key: idx, wrap: 'truncate', flexShrink: 0, flexDirection: 'row' }, ...fragments);
      })
    )
  );
};

module.exports = App;
