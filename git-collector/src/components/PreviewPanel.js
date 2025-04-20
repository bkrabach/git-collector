const React = require('react');
const { Box, Text, useStdout, useInput } = require('ink');
const path = require('path');
// js-tiktoken for accurate token counting
const { Tiktoken } = require('js-tiktoken/lite');
const o200k_base = require('js-tiktoken/ranks/o200k_base');
const encoder = new Tiktoken(o200k_base);

// PreviewPanel: renders file full content or markdown
// PreviewPanel: renders file full content or highlighted code
// PreviewPanel: renders file full content or highlighted code, clipped to listHeight rows
function PreviewPanel({ previewContent, previewTitle, listHeight, focus, width }) {
  const ext = path.extname(previewTitle).slice(1).toLowerCase();
  // get terminal width for border
  const { stdout } = useStdout();
  const totalCols = stdout.columns || 0;
  // panel header (truncate long titles)
  // panel header: fixed height, don't grow vertically
  // Compute file size
  const sizeBytes = Buffer.byteLength(previewContent || '', 'utf8');
  const sizeStr = sizeBytes >= 1024
    ? `${(sizeBytes / 1024).toFixed(1)} KB`
    : `${sizeBytes} B`;
  // Accurate token count via js-tiktoken
  let tokenCount = 0;
  if (previewContent) {
    try {
      tokenCount = encoder.encode(previewContent).length;
    } catch {}
  }
  // Format token count with 'k' suffix above 1000
  const tokLabel = tokenCount >= 1000
    ? `${(tokenCount / 1000).toFixed(1)}k tok`
    : `${tokenCount} tok`;
  const tokenStr = `${sizeStr} | ${tokLabel}`;
  const header = React.createElement(
    Box,
    { height: 1, flexShrink: 0, width, flexDirection: 'row', justifyContent: 'space-between' },
    React.createElement(
      Text,
      { color: focus === 'preview' ? 'magenta' : 'white', bold: focus === 'preview', wrap: 'truncate' },
      ` ${previewTitle} `
    ),
    React.createElement(
      Text,
      { color: focus === 'preview' ? 'magenta' : 'white', bold: focus === 'preview', wrap: 'truncate' },
      ` ${tokenStr} `
    )
  );
  // Prepare line buffers and scroll offsets
  const allLines = (previewContent || '').split(/\r?\n/);
  const contentHeight = Math.max(0, listHeight - 2);
  const maxVOff = Math.max(0, allLines.length - contentHeight);
  const maxLineLen = allLines.reduce((m, l) => Math.max(m, l.length), 0);
  const maxHOff = Math.max(0, maxLineLen - width);
  const [vOff, setVOff] = React.useState(0);
  const [hOff, setHOff] = React.useState(0);
  useInput((input, key) => {
    if (focus !== 'preview') return;
    const seq = input || '';
    // Fast vertical scroll via Shift/Ctrl + Up/Down (~10% of height)
    if (seq.includes('[1;2A') || seq.includes('[1;5A')) {
      setVOff(o => Math.max(0, o - Math.max(1, Math.floor(contentHeight * 0.10))));
      return;
    }
    if (seq.includes('[1;2B') || seq.includes('[1;5B')) {
      setVOff(o => Math.min(maxVOff, o + Math.max(1, Math.floor(contentHeight * 0.10))));
      return;
    }
    // Fast horizontal scroll via Shift/Ctrl + Left/Right (~10% of width)
    const fastH = Math.max(1, Math.floor(width * 0.10));
    if (seq.includes('[1;2D') || seq.includes('[1;5D')) {
      setHOff(o => Math.max(0, o - fastH));
      return;
    }
    if (seq.includes('[1;2C') || seq.includes('[1;5C')) {
      setHOff(o => Math.min(maxHOff, o + fastH));
      return;
    }
    // Home/End for horizontal
    if (key.home) { setHOff(0); return; }
    if (key.end) { setHOff(maxHOff); return; }
    // Normal arrow navigation
    if (key.upArrow) { setVOff(o => Math.max(0, o - 1)); return; }
    if (key.downArrow) { setVOff(o => Math.min(maxVOff, o + 1)); return; }
    if (key.leftArrow) { setHOff(o => Math.max(0, o - 1)); return; }
    if (key.rightArrow) { setHOff(o => Math.min(maxHOff, o + 1)); return; }
  }, { isActive: focus === 'preview' });
  // Markdown
  if (ext === 'md') {
    const mdLines = allLines;
    const sliceLines = mdLines.slice(vOff, vOff + contentHeight);
    const fragLines = sliceLines.map((line) =>
      (line.padEnd(hOff + width, ' ').slice(hOff, hOff + width)) || ' '
    );
    const lines = fragLines.map((text, i) =>
      React.createElement(Text, { key: `md-${i}`, wrap: 'truncate' }, text)
    );
    // pad to fill content area
    const padCount = Math.max(0, contentHeight - lines.length);
    for (let i = 0; i < padCount; i++) {
      lines.push(
        React.createElement(
          Text,
          { key: `pad-${i}`, wrap: 'truncate' },
          ''
        )
      );
    }
    // border under header
    const border = React.createElement(
      Text,
      { color: focus === 'preview' ? 'magenta' : 'gray', key: 'border', wrap: 'truncate' },
      '─'.repeat(width)
    );
    return React.createElement(
      Box,
      { flexDirection: 'column', width, height: listHeight },
      header,
      border,
      ...lines
    );
  }
  // build code/data preview lines (highlight only if language supported)
  const linesRaw = allLines;
  let highlight, supportsLanguage;
  try {
    const cli = require('cli-highlight');
    highlight = cli.highlight;
    supportsLanguage = cli.supportsLanguage;
  } catch {
    highlight = null;
    supportsLanguage = () => false;
  }
  const shouldHighlight = highlight && ext && supportsLanguage(ext);
  // Vertical slice
  const vert = linesRaw.slice(vOff, vOff + contentHeight);
  // Horizontal slice
  const rawSlice = vert.map((l) => l.padEnd(hOff + width, ' ').slice(hOff, hOff + width));
  // Apply syntax highlighting per visible fragment if supported
  const lines2 = rawSlice.map((frag, i) => {
    const text = frag === '' ? ' ' : frag;
    const content = shouldHighlight
      ? (() => {
          try { return highlight(text, { language: ext, ignoreIllegals: true }); }
          catch { return text; }
        })()
      : text;
    return React.createElement(
      Text,
      { key: `line-${i}`, wrap: 'truncate' },
      content
    );
  });
  // Pad to fill content area if needed
  const pad2 = Math.max(0, contentHeight - lines2.length);
  for (let i = 0; i < pad2; i++) lines2.push(React.createElement(Text, { key: `pad2-${i}`, wrap: 'truncate' }, ''));
  // border under header
  const border2 = React.createElement(Text, { color: focus === 'preview' ? 'magenta' : 'gray', key: 'border2', wrap: 'truncate' }, '─'.repeat(width));
  return React.createElement(Box, { flexDirection: 'column', width, height: listHeight }, header, border2, ...lines2);
}

module.exports = PreviewPanel;