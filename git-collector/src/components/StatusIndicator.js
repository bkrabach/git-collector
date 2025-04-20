const React = require('react');
const { Box, Text } = require('ink');

// A simple spinner indicator with message
const frames = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];

function StatusIndicator({ message }) {
  const [frameIndex, setFrameIndex] = React.useState(0);
  React.useEffect(() => {
    const timer = setInterval(() => {
      setFrameIndex(i => (i + 1) % frames.length);
    }, 80);
    return () => clearInterval(timer);
  }, []);
  return React.createElement(
    Box,
    { height: 1 },
    React.createElement(Text, { color: 'yellow' }, `${frames[frameIndex]} ${message}`)
  );
}

module.exports = StatusIndicator;