const React = require('react');
const { Box, Text, useInput, useApp, useStdout } = require('ink');
const { fetchTree, fetchContent } = require('./utils/fetchers');
const { buildTree, sortTree, flattenTree, getDescendantPaths } = require('./utils/tree');
const { parseGitHubUrl } = require('./utils/urlUtils');
const TreePanel = require('./components/TreePanel');
const PreviewPanel = require('./components/PreviewPanel');

const App = ({ url }) => {
  const { exit } = useApp();
  const [entries, setEntries] = React.useState(null);
  const [tree, setTree] = React.useState(null);
  const [offset, setOffset] = React.useState(0);
  const [error, setError] = React.useState(null);
  const [selected, setSelected] = React.useState(new Set());
  const [prevSelected, setPrevSelected] = React.useState(new Set());
  const [cursor, setCursor] = React.useState(0);
  const [previewContent, setPreviewContent] = React.useState('');
  const [previewTitle, setPreviewTitle] = React.useState('Preview');
  // focus: 'tree' or 'preview'
  const [focus, setFocus] = React.useState('tree');
  // scroll offset for preview
  const [previewOffset, setPreviewOffset] = React.useState(0);

  // parse GitHub URL for owner, repo, branch, initial path
  const { owner, repo, branch, initialPathParts } = parseGitHubUrl(url);
  // track mounted for async state updates
  const mountedRef = React.useRef(true);
  React.useEffect(() => () => { mountedRef.current = false; }, []);

  const selectionFilePath = React.useMemo(() => {
    const homedir = require('os').homedir();
    const path = require('path');
    const baseDir = path.join(homedir, '.git-collector');
    if (!require('fs').existsSync(baseDir)) {
      require('fs').mkdirSync(baseDir);
    }
    const filename = url.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.json';
    return path.join(baseDir, filename);
  }, [url]);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const flat = await fetchTree(url, branch);
        if (!mounted) return;
        const sorted = flat.map((e) => ({ path: e.path, type: e.type }))
          .sort((a, b) => a.path.localeCompare(b.path));
        setEntries(sorted);
        // build and sort tree, then determine view root
        const root = buildTree(sorted);
        sortTree(root);
        let viewRoot = root;
        if (initialPathParts.length > 0) {
          let curr = root;
          for (const part of initialPathParts) {
            const next = curr.children.find((c) => c.name === part);
            if (!next) break;
            next.isExpanded = true;
            curr = next;
          }
          viewRoot = curr;
        }
        setTree(viewRoot);
      } catch (err) {
        if (mounted) setError(err.message);
      }
      try {
        if (mounted && require('fs').existsSync(selectionFilePath)) {
          const data = JSON.parse(require('fs').readFileSync(selectionFilePath, 'utf8'));
          if (Array.isArray(data.selected)) {
            setPrevSelected(new Set(data.selected));
            setSelected(new Set(data.selected));
          }
        }
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  const { stdout } = useStdout();
  const totalRows = stdout.rows || 0;
  const totalCols = stdout.columns || 0;
  const controlsHeight = 1;
  const listHeight = Math.max(0, totalRows - controlsHeight);
  const flattened = tree ? flattenTree(tree) : [];
  const visible = flattened.slice(offset, offset + listHeight);
  const depthOffset = initialPathParts.length > 0 ? 1 : 0;

  // Keyboard input handling with focus
  useInput((input, key) => {
    if (!tree) return;
    // Switch focus between panels
    if (key.tab) {
      setFocus((f) => (f === 'tree' ? 'preview' : 'tree'));
      return;
    }
    // Save or quit
    if (input === 's') {
      const toWrite = { selected: Array.from(selected) };
      require('fs').writeFileSync(selectionFilePath, JSON.stringify(toWrite, null, 2));
      exit();
      return;
    }
    if (input === 'q') {
      exit();
      return;
    }
    if (focus === 'tree') {
      // Tree navigation and actions
      if (key.upArrow) {
        if (cursor > 0) {
          const nc = cursor - 1;
          setCursor(nc);
          if (nc < offset) setOffset(nc);
        }
      } else if (key.downArrow) {
        if (cursor < flattened.length - 1) {
          const nc = cursor + 1;
          setCursor(nc);
          if (nc >= offset + listHeight) setOffset(offset + 1);
        }
      } else if (key.pageUp) {
        const nc = Math.max(0, cursor - listHeight);
        setCursor(nc);
        setOffset(Math.max(0, offset - listHeight));
      } else if (key.pageDown) {
        const nc = Math.min(flattened.length - 1, cursor + listHeight);
        setCursor(nc);
        const mo = Math.max(0, flattened.length - listHeight);
        setOffset(Math.min(mo, offset + listHeight));
      }
      else if (key.leftArrow) {
        // collapse directory or move to parent
        const { node, depth } = flattened[cursor] || {};
        if (node && node.type === 'tree' && node.isExpanded) {
          node.isExpanded = false;
          setTree((t) => ({ ...t }));
        } else if (depth > 1) {
          for (let i = cursor - 1; i >= 0; i--) {
            if (flattened[i].depth === depth - 1) {
              setCursor(i);
              if (i < offset) setOffset(i);
              break;
            }
          }
        }
      } else if (key.rightArrow) {
        // expand directory or move into
        const { node } = flattened[cursor] || {};
        if (node && node.type === 'tree' && !node.isExpanded) {
          node.isExpanded = true;
          setTree((t) => ({ ...t }));
        } else if (node && node.type === 'tree' && node.isExpanded && node.children.length) {
          const nc = cursor + 1;
          setCursor(nc);
          if (nc >= offset + listHeight) setOffset(offset + 1);
        }
      } else if (input === ' ') {
        const { node } = flattened[cursor] || {};
        if (node) {
          if (node.type === 'tree') {
            // toggle selection of entire directory
            const desc = getDescendantPaths(node);
            const allSel = desc.every((p) => selected.has(p));
            const newSel = new Set(selected);
            if (allSel) desc.forEach((p) => newSel.delete(p));
            else desc.forEach((p) => newSel.add(p));
            setSelected(newSel);
          } else {
            // toggle single file selection
            const newSel = new Set(selected);
            if (newSel.has(node.path)) newSel.delete(node.path);
            else newSel.add(node.path);
            setSelected(newSel);
          }
        }
      } else if (key.return) {
        const { node } = flattened[cursor] || {};
        if (node) {
          if (node.type === 'tree') {
            // expand/collapse directory
            node.isExpanded = !node.isExpanded;
            setTree((t) => ({ ...t }));
          } else if (mountedRef.current) {
            // preview file
            setPreviewTitle(node.name || node.path);
            setPreviewContent('Loading...');
            fetchContent(url, node.path)
              .then((c) => { if (mountedRef.current) setPreviewContent(c); })
              .catch((e) => { if (mountedRef.current) setPreviewContent('Error: ' + e.message); });
          }
        }
      }
    } else {
      // Preview panel scrolling
      const lines = previewContent.split(/\r?\n/);
      const maxOff = Math.max(0, lines.length - (listHeight - 1));
      if (key.upArrow) setPreviewOffset((o) => Math.max(0, o - 1));
      else if (key.downArrow) setPreviewOffset((o) => Math.min(maxOff, o + 1));
      else if (key.pageUp) setPreviewOffset((o) => Math.max(0, o - (listHeight - 1)));
      else if (key.pageDown) setPreviewOffset((o) => Math.min(maxOff, o + (listHeight - 1)));
    }
  });

  if (error) {
    return React.createElement(Text, { color: 'red' }, 'Error: ' + error);
  }
  if (!tree) {
    return React.createElement(Text, null, 'Loading repository tree...');
  }

  // compute required left panel width
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
  const leftWidth = Math.min(totalCols - 1, leftLines.reduce((m, l) => Math.max(m, l.length), 0));
  // full file content in previewContent; no slicing

  return React.createElement(
    Box,
    { flexDirection: 'column', height: totalRows },
    // Main panels row
    React.createElement(
      Box,
      { flexDirection: 'row', height: listHeight },
      React.createElement(TreePanel, { visible, offset, listHeight, depthOffset, selected, prevSelected, cursor, leftWidth }),
      // Vertical separator
      React.createElement(
        Box,
        { flexDirection: 'column', width: 3, height: listHeight, flexShrink: 0 },
        ...Array(listHeight).fill(null).map((_, i) =>
          React.createElement(Text, { key: `sep-${i}`, color: 'gray' }, '│')
        )
      ),
      React.createElement(PreviewPanel, { previewContent, previewTitle, listHeight, previewOffset })
    ),
    // Horizontal separator above controls
    React.createElement(
      Box,
      { height: 1, width: totalCols, backgroundColor: 'black' },
      React.createElement(Text, { color: 'gray' }, '─'.repeat(totalCols))
    ),
    // Controls bar: full width, solid background to hide preview below
    React.createElement(
      Box,
      { height: controlsHeight, width: totalCols, backgroundColor: 'black' },
      React.createElement(Text, { color: 'gray' }, 'Controls: ↑/↓ navigate, PgUp/PgDn page, ←/→ expand/collapse, space select, s save&quit, q quit')
    )
  );
};

module.exports = App;