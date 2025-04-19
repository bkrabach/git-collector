const React = require('react');
const { Box, Text } = require('ink');
const path = require('path');

// PreviewPanel: renders file full content or markdown
// PreviewPanel: renders file full content or highlighted code
// PreviewPanel: renders file full content or highlighted code, clipped to listHeight rows
function PreviewPanel({ previewContent, previewTitle, listHeight, previewOffset }) {
  const ext = path.extname(previewTitle).slice(1).toLowerCase();
  // Markdown
  if (ext === 'md') {
    let Markdown;
    try {
      const mm = require('ink-markdown');
      Markdown = mm && mm.default ? mm.default : mm;
    } catch {
      Markdown = null;
    }
    // build Markdown preview lines
    const mdContent = previewContent.split(/\r?\n/);
    const maxLines = Math.max(0, listHeight - 1);
    const sliceLines = mdContent.slice(previewOffset, previewOffset + maxLines);
    const lines = [];
    lines.push(React.createElement(Text, { underline: true, key: 'title' }, previewTitle));
    if (Markdown) {
      lines.push(React.createElement(Markdown, { key: 'md' }, sliceLines.join('\n')));
    } else {
      sliceLines.forEach((line, i) => lines.push(React.createElement(Text, { key: `md-${i}` }, line)));
    }
    // pad to fill listHeight
    const padCount = Math.max(0, listHeight - lines.length);
    for (let i = 0; i < padCount; i++) {
      lines.push(React.createElement(Text, { key: `pad-${i}` }, ''));
    }
    return React.createElement(
      Box,
      { flexDirection: 'column', flexGrow: 1, paddingLeft: 1, height: listHeight },
      lines
    );
  }
  // Code or data: attempt syntax highlight, clipped to listHeight
  const linesRaw = previewContent.split(/\r?\n/);
  let highlight;
  try { ({ highlight } = require('cli-highlight')); } catch { highlight = null; }
  const processed = (highlight && ext)
    ? linesRaw.map((l) => {
        try { return highlight(l, { language: ext, ignoreIllegals: true }); }
        catch { return l; }
      })
    : linesRaw;
  const maxLines2 = Math.max(0, listHeight - 1);
  const slice2 = processed.slice(previewOffset, previewOffset + maxLines2);
  const lines2 = [];
  lines2.push(React.createElement(Text, { underline: true, key: 'title2' }, previewTitle));
  slice2.forEach((line, i) => lines2.push(React.createElement(Text, { key: `line-${i}` }, line)));
  const pad2 = Math.max(0, listHeight - lines2.length);
  for (let i = 0; i < pad2; i++) {
    lines2.push(React.createElement(Text, { key: `pad2-${i}` }, ''));
  }
  return React.createElement(
    Box,
    { flexDirection: 'column', flexGrow: 1, paddingLeft: 1, height: listHeight },
    lines2
  );
}

module.exports = PreviewPanel;