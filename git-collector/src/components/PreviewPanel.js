const React = require('react');
const { Box, Text, useStdout } = require('ink');
const path = require('path');
// js-tiktoken for accurate token counting
const { Tiktoken } = require('js-tiktoken/lite');
const o200k_base = require('js-tiktoken/ranks/o200k_base');
const encoder = new Tiktoken(o200k_base);

// PreviewPanel: renders file full content or markdown
// PreviewPanel: renders file full content or highlighted code
// PreviewPanel: renders file full content or highlighted code, clipped to listHeight rows
function PreviewPanel({ previewContent, previewTitle, listHeight, previewOffset, previewHOffset = 0, focus, width }) {
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
  // Markdown
  if (ext === 'md') {
    // build preview lines for Markdown: treat as plain text, one row per original line, truncating any overflow
    const mdLines = previewContent.split(/\r?\n/);
    // reserve two rows: header and border
    const contentHeight = Math.max(0, listHeight - 2);
    const sliceLines = mdLines.slice(previewOffset, previewOffset + contentHeight);
    const fragLines = sliceLines.map((line) =>
      // Pad and slice for horizontal scroll; blank lines as single space
      line
        .padEnd(previewHOffset + width, ' ')
        .slice(previewHOffset, previewHOffset + width) || ' '
    );
    const lines = fragLines.map((text, i) =>
      React.createElement(
        Text,
        { key: `md-${i}`, wrap: 'truncate' },
        text
      )
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
  const linesRaw = previewContent.split(/\r?\n/);
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
  const contentHeight2 = Math.max(0, listHeight - 2);
  // Vertical slice
  const vert = linesRaw.slice(previewOffset, previewOffset + contentHeight2);
  // Horizontal slice on raw lines
  const rawSlice = vert.map((l) =>
    l.padEnd(previewHOffset + width, ' ').slice(previewHOffset, previewHOffset + width)
  );
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
  const pad2 = Math.max(0, contentHeight2 - lines2.length);
  for (let i = 0; i < pad2; i++) {
    lines2.push(
      React.createElement(
        Text,
        { key: `pad2-${i}`, wrap: 'truncate' },
        ''
      )
    );
  }
  // border under header
  const border2 = React.createElement(
    Text,
    { color: focus === 'preview' ? 'magenta' : 'gray', key: 'border2', wrap: 'truncate' },
    '─'.repeat(width)
  );
  return React.createElement(
    Box,
    { flexDirection: 'column', width, height: listHeight },
    header,
    border2,
    ...lines2
  );
}

module.exports = PreviewPanel;