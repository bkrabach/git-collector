const React = require('react');
const { Box, Text, useApp, useStdout } = require('ink');
const useRepoTree = require('./hooks/useRepoTree');
// flattenTree unused directly; rely on useRepoTree flattened output
const { sortTree } = require('./utils/tree');
// const useSelectionPersistence = require('./hooks/useSelectionPersistence'); // no longer used
const usePreview = require('./hooks/usePreview');
const useKeyboardNavigation = require('./hooks/useKeyboardNavigation');
const TreePanel = require('./components/TreePanel');
const PreviewPanel = require('./components/PreviewPanel');
const { getDescendantPaths } = require('./utils/tree');
const { toggleSelectionSet } = require('./utils/selection');
const { fetchContent } = require('./utils/fetchers');
const fs = require('fs');
const path = require('path');

const App = ({ url, initialSelections = [], destPath }) => {
  // Wrap Ink exit to clear screen before unmounting
  const { exit: inkExit } = useApp();
  // Wrap Ink's exit function; actual screen clearing is handled by the CLI wrapper
  const exit = () => {
    inkExit();
  };
  const { tree, setTree, flattened, error, parsed } = useRepoTree(url);
  // Initialize selection state
  const [selected, setSelected] = React.useState(() => new Set(initialSelections));
  const prevSelected = React.useMemo(() => new Set(initialSelections), [initialSelections]);
  // On initial load, expand all directories that contain selected files
  const [hasExpanded, setHasExpanded] = React.useState(false);
  React.useEffect(() => {
    if (!hasExpanded && tree) {
      setHasExpanded(true);
      // 1) Expand all directories that contained previously selected files
      const dirsToExpand = new Set();
      initialSelections.forEach((fp) => {
        const parts = fp.split('/');
        let prefix = '';
        for (let i = 0; i < parts.length - 1; i++) {
          prefix = prefix ? `${prefix}/${parts[i]}` : parts[i];
          dirsToExpand.add(prefix);
        }
      });
      function expand(node) {
        if (dirsToExpand.has(node.path)) node.isExpanded = true;
        if (node.children) node.children.forEach(expand);
      }
      expand(tree);
      // 2) Inject phantom ancestors and missing files into tree
      const nodeMap = new Map();
      function buildMap(node) {
        nodeMap.set(node.path, node);
        if (node.type === 'tree' && Array.isArray(node.children)) {
          node.children.forEach(buildMap);
        }
      }
      buildMap(tree);
      initialSelections.forEach((fp) => {
        const parts = fp.split('/');
        let prefix = '';
        // Ensure ancestor directories exist as phantom nodes
        for (let i = 0; i < parts.length - 1; i++) {
          prefix = prefix ? `${prefix}/${parts[i]}` : parts[i];
          if (!nodeMap.has(prefix)) {
            const parentPath = prefix.includes('/') ? prefix.slice(0, prefix.lastIndexOf('/')) : '';
            const parent = parentPath ? nodeMap.get(parentPath) : tree;
            const newDir = { name: parts[i], path: prefix, type: 'tree', children: [], isExpanded: true, missing: true };
            if (parent && Array.isArray(parent.children)) {
              parent.children.push(newDir);
            }
            nodeMap.set(prefix, newDir);
          }
        }
        // Ensure file node exists as phantom if missing
        if (!nodeMap.has(fp)) {
          const fileName = parts[parts.length - 1];
          const parentPath = parts.length > 1 ? parts.slice(0, parts.length - 1).join('/') : '';
          const parent = parentPath ? nodeMap.get(parentPath) : tree;
          const newFile = { name: fileName, path: fp, type: 'blob', missing: true };
          if (parent && Array.isArray(parent.children)) {
            parent.children.push(newFile);
          }
          nodeMap.set(fp, newFile);
        }
      });
      // Sort tree to position phantoms correctly
      sortTree(tree);
      // Trigger re-render
      setTree({ ...tree });
    }
  }, [tree, hasExpanded, initialSelections, setTree]);
  const toggleSelection = (node) => setSelected((prev) => toggleSelectionSet(prev, node, getDescendantPaths));
  const saveSelection = (exitFn) => {
    // Only include existing files; omit missing phantom entries
    const realPaths = new Set(
      flattened.filter(({ node }) => node.type === 'blob' && !node.missing).map(({ node }) => node.path)
    );
    const paths = Array.from(selected).filter((p) => realPaths.has(p)).sort();
    (async () => {
      const date = new Date().toLocaleString();
      const md = [];
      md.push('# Git Collector Data');
      md.push(`URL: ${url}`);
      md.push(`Date: ${date}`);
      md.push(`Files: ${paths.length}`);
      md.push('');
      for (const filePath of paths) {
        // File section separator
        md.push(`=== File: ${filePath} ===`);
        try {
          const content = await fetchContent(url, filePath);
          md.push(content);
        } catch (e) {
          md.push(`// Error loading file: ${e.message}`);
        }
        md.push('');
      }
      fs.writeFileSync(destPath, md.join('\n'), 'utf8');
      exitFn();
    })();
  };
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
  // Visible slice from flattened tree
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
