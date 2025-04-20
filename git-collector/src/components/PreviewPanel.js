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
function PreviewPanel({ previewContent, previewTitle, listHeight, focus, width, wrapEnabled, toggleWrap }) {
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
  // Prepare raw lines
  const allLines = (previewContent || '').split(/\r?\n/);
  const contentHeight = Math.max(0, listHeight - 2);
  // Word-wrapping helper: break line on whitespace
  function wrapLine(line) {
    if (line.length <= width) return [line];
    const words = line.split(/(\s+)/);
    const lines = [];
    let curr = '';
    for (const w of words) {
      if (curr.length + w.length <= width) {
        curr += w;
      } else {
        if (curr) lines.push(curr);
        if (w.length > width) {
          for (let i = 0; i < w.length; i += width) {
            lines.push(w.slice(i, i + width));
          }
          curr = '';
        } else {
          curr = w;
        }
      }
    }
    if (curr) lines.push(curr);
    return lines;
  }
  // Build source lines (wrapped or raw)
  const sourceLines = React.useMemo(() => {
    if (!wrapEnabled) return allLines;
    const out = [];
    for (const line of allLines) {
      const sub = wrapLine(line);
      out.push(...(sub.length > 0 ? sub : ['']));
    }
    return out;
  }, [allLines, wrapEnabled, width]);
  const maxVOff = Math.max(0, sourceLines.length - contentHeight);
  // Max horizontal offset only when not wrapping
  const maxHOff = React.useMemo(() => {
    if (wrapEnabled) return 0;
    const maxLen = allLines.reduce((m, l) => Math.max(m, l.length), 0);
    return Math.max(0, maxLen - width);
  }, [wrapEnabled, allLines, width]);
  const [vOff, setVOff] = React.useState(0);
  const [hOff, setHOff] = React.useState(0);
  useInput((input, key) => {
    if (focus !== 'preview') return;
    // Toggle wrapping
    // Toggle wrapping mode
    if (input === 'r') {
      toggleWrap((w) => !w);
      setVOff(0);
      setHOff(0);
      return;
    }
    const seq = input || '';
    // Vertical scrolling
    if (seq.includes('[1;2A') || seq.includes('[1;5A')) {
      setVOff((o) => Math.max(0, o - Math.max(1, Math.floor(contentHeight * 0.10))));
      return;
    }
    if (seq.includes('[1;2B') || seq.includes('[1;5B')) {
      setVOff((o) => Math.min(maxVOff, o + Math.max(1, Math.floor(contentHeight * 0.10))));
      return;
    }
    // Single-line vertical scroll
    if (key.upArrow) { setVOff((o) => Math.max(0, o - 1)); return; }
    if (key.downArrow) { setVOff((o) => Math.min(maxVOff, o + 1)); return; }
    // Page-wise vertical scroll (~90% of view for context)
    if (key.pageUp) {
      const step = Math.max(1, Math.floor(contentHeight * 0.9));
      setVOff((o) => Math.max(0, o - step));
      return;
    }
    if (key.pageDown) {
      const step = Math.max(1, Math.floor(contentHeight * 0.9));
      setVOff((o) => Math.min(maxVOff, o + step));
      return;
    }
    // Horizontal scrolling only when not wrapping
    if (!wrapEnabled) {
      const fastH = Math.max(1, Math.floor(width * 0.10));
      // Fast left/right via Shift/Ctrl+arrow
      if (seq.includes('[1;2D') || seq.includes('[1;5D')) { setHOff((o) => Math.max(0, o - fastH)); return; }
      if (seq.includes('[1;2C') || seq.includes('[1;5C')) { setHOff((o) => Math.min(maxHOff, o + fastH)); return; }
      // Single-step
      if (key.leftArrow) { setHOff((o) => Math.max(0, o - 1)); return; }
      if (key.rightArrow) { setHOff((o) => Math.min(maxHOff, o + 1)); return; }
      // Page-wise horizontal scroll (~90% of width for context)
      const pageH = Math.max(1, Math.floor(width * 0.9));
      // home/end keys or raw sequences
      const raw = seq;
      const isHome = key.home || raw.includes('[H') || raw.includes('OH') || raw.includes('1~');
      if (isHome) { setHOff((o) => Math.max(0, o - pageH)); return; }
      const isEnd = key.end || raw.includes('[F') || raw.includes('OF') || raw.includes('4~');
      if (isEnd) { setHOff((o) => Math.min(maxHOff, o + pageH)); return; }
    }
  }, { isActive: focus === 'preview' });
  // Compute the slice of lines to display
  const slice = sourceLines.slice(vOff, vOff + contentHeight);
  // Determine highlighting support
  let highlightFn = null;
  let supportsLang = () => false;
  try {
    const cli = require('cli-highlight');
    highlightFn = cli.highlight;
    supportsLang = cli.supportsLanguage;
  } catch {}
  const shouldHighlight = ext && highlightFn && supportsLang(ext) && !wrapEnabled;
  // Build rendered lines
  const rendered = slice.map((line, i) => {
    // Prepare text fragment
    let text = wrapEnabled
      ? line.padEnd(width, ' ')
      : (line.padEnd(hOff + width, ' ').slice(hOff, hOff + width) || ' ');
    // Apply highlighting if applicable
    const content = shouldHighlight
      ? (() => { try { return highlightFn(text, { language: ext, ignoreIllegals: true }); } catch { return text; } })()
      : text;
    return React.createElement(Text, { key: `line-${i}`, wrap: 'truncate' }, content);
  });
  // Pad to fill content area
  const padCount = Math.max(0, contentHeight - rendered.length);
  for (let i = 0; i < padCount; i++) {
    rendered.push(React.createElement(Text, { key: `pad-${i}`, wrap: 'truncate' }, ''));
  }
  // Border under header
  const border = React.createElement(Text, { color: focus === 'preview' ? 'magenta' : 'gray', wrap: 'truncate' }, '─'.repeat(width));
  return React.createElement(Box, { flexDirection: 'column', width, height: listHeight }, header, border, ...rendered);
}

module.exports = PreviewPanel;