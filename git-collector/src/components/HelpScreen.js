const React = require("react");
const { Box, Text, useInput, useStdout } = require("ink");

/**
 * Full-screen help modal. Press any key to dismiss.
 */
function HelpScreen({ onClose, focus }) {
  useInput(() => {
    onClose();
  });
  // Determine terminal size for full-screen overlay
  const { stdout } = useStdout();
  const cols = stdout.columns || 0;
  const rows = stdout.rows || 0;
  const sectionWidth = 50;
  // Extended help text
  const intro = [
    "Git Collector provides a terminal UI to explore GitHub repos,",
    "select files, preview contents, and export to Markdown.",
    "Use commands to navigate the file tree or preview pane,",
    "and write/update your data file seamlessly.",
  ];
  // Navigation commands by focus
  const treeNav = [
    ["↑ / ↓", "move selection"],
    ["<shift> ↑ / <shift> ↓", "move selection (fast)"],
    ["PgUp / PgDn", "page selection"],
    ["← / →", "collapse/expand"],
    ["<space>", "toggle select"],
    ["<enter>", "preview file"],
    ["<tab>", "switch focus"],
  ];
  const previewNav = [
    ["↑ / ↓", "scroll vertically"],
    ["<shift> ↑ / <shift> ↓", "scroll vertically (fast)"],
    ["PgUp / PgDn", "page scroll"],
    ["← / →", "scroll horizontally"],
    ["<shift> ← / <shift> →", "scroll horizontally (fast)"],
    ["Home / End", "jump start/end"],
    ["<tab>", "switch focus"],
  ];
  const actions = [
    ["w", "write selections"],
    ["x", "write & quit"],
    ["q", "quit"],
    ["h", "help"],
  ];
  const sepLine = React.createElement(
    Text,
    { color: focus === "tree" ? "magenta" : "gray", wrap: "truncate" },
    "─".repeat(sectionWidth)
  );
  return React.createElement(
    Box,
    {
      flexDirection: "column",
      width: cols,
      height: rows,
      paddingX: 4,
      paddingY: 2,
    },
    // Intro paragraphs
    ...intro.map((t, i) =>
      React.createElement(Text, { key: "i" + i, color: "white" }, t)
    ),
    React.createElement(Box, { height: 1 }),
    // Navigation section
    React.createElement(
      Box,
      { flexDirection: "row" },
      React.createElement(
        Box,
        { flexDirection: "column", width: sectionWidth, marginRight: 2 },
        React.createElement(
          Text,
          { color: "magenta", bold: true },
          "Tree Navigation"
        ),
        sepLine,
        ...treeNav.map(([k, d], i) => {
          const parts = k.split("/");
          const keyEls = [];
          parts.forEach((part, pi) => {
            keyEls.push(
              React.createElement(
                Text,
                { color: "magenta", key: `k${i}${pi}` },
                part.trim()
              )
            );
            if (pi < parts.length - 1)
              keyEls.push(
                React.createElement(
                  Text,
                  { color: "white", key: `s${i}${pi}` },
                  " / "
                )
              );
          });
          return React.createElement(
            Text,
            { key: "nav" + i },
            ...keyEls,
            React.createElement(Text, { color: "white" }, `  ${d}`)
          );
        })
      ),
      React.createElement(
        Box,
        { flexDirection: "column", width: sectionWidth, marginLeft: 2 },
        React.createElement(
          Text,
          { color: "magenta", bold: true },
          "Preview Navigation"
        ),
        sepLine,
        ...previewNav.map(([k, d], i) => {
          const parts = k.split("/");
          const keyEls = [];
          parts.forEach((part, pi) => {
            keyEls.push(
              React.createElement(
                Text,
                { color: "magenta", key: `k${i}${pi}` },
                part.trim()
              )
            );
            if (pi < parts.length - 1)
              keyEls.push(
                React.createElement(
                  Text,
                  { color: "white", key: `s${i}${pi}` },
                  " / "
                )
              );
          });
          return React.createElement(
            Text,
            { key: "nav" + i },
            ...keyEls,
            React.createElement(Text, { color: "white" }, `  ${d}`)
          );
        })
      )
    ),
    React.createElement(Box, { height: 1 }),
    // Actions section
    React.createElement(Text, { color: "magenta", bold: true }, "Actions"),
    sepLine,
    ...actions.map(([k, d], i) =>
      React.createElement(
        Text,
        { key: "act" + i },
        React.createElement(Text, { color: "magenta" }, k),
        React.createElement(Text, { color: "white" }, `  ${d}`)
      )
    ),
    React.createElement(Box, { height: 1 }),
    React.createElement(Text, { color: "gray" }, "Press any key to return.")
  );
}

module.exports = HelpScreen;
