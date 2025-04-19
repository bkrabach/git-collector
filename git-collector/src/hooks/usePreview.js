const React = require('react');
const { fetchContent } = require('../utils/fetchers');

/**
 * Hook to manage file preview state and loading.
 * @param {string} url - Repository URL for content fetch.
 * @returns {{
 *   previewContent: string,
 *   previewTitle: string,
 *   previewOffset: number,
 *   setPreviewOffset: function,
 *   previewFile: function(object)
 * }}
 */
function usePreview(url) {
  const [previewContent, setPreviewContent] = React.useState('');
  const [previewTitle, setPreviewTitle] = React.useState('Preview');
  const [previewOffset, setPreviewOffset] = React.useState(0);
  const mountedRef = React.useRef(true);
  React.useEffect(() => () => { mountedRef.current = false; }, []);

  /**
   * Load the content of a given node for preview.
   * @param {{ path: string, name?: string }} node
   */
  function previewFile(node) {
    if (!node) return;
    setPreviewTitle(node.name || node.path);
    setPreviewContent('Loading...');
    setPreviewOffset(0);
    fetchContent(url, node.path)
      .then((c) => { if (mountedRef.current) setPreviewContent(c); })
      .catch((e) => { if (mountedRef.current) setPreviewContent('Error: ' + e.message); });
  }

  return { previewContent, previewTitle, previewOffset, setPreviewOffset, previewFile };
}

module.exports = usePreview;