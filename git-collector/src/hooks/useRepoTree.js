const React = require('react');
const { fetchTree } = require('../utils/githubClient');
const { buildTree, sortTree, flattenTree } = require('../utils/tree');
const { parseGitHubUrl } = require('../utils/urlUtils');
const { mergePhantomNodes } = require('../utils/phantomTree');

/**
 * Hook to fetch and build a GitHub repo tree, injecting phantom nodes for selected paths.
 * @param {string} url - GitHub repository URL.
 * @param {string[]} [initialSelections] - File paths to add as phantom nodes.
 * @returns {{
 *   tree: object | null,
 *   setTree: Function,
 *   flattened: Array<{node: object, depth: number}>,
 *   error: string | null,
 *   parsed: {owner: string, repo: string, branch: string, initialPathParts: string[]}
 * }}
 */
function useRepoTree(url, initialSelections = []) {
  const [tree, setTree] = React.useState(null);
  const [error, setError] = React.useState(null);
  const parsed = React.useMemo(() => parseGitHubUrl(url), [url]);
  const { branch, initialPathParts } = parsed;

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const flat = await fetchTree(url, branch);
        if (!mounted) return;
        const sorted = flat.map(e => ({ path: e.path, type: e.type }))
          .sort((a, b) => a.path.localeCompare(b.path));
        const root = buildTree(sorted);
        sortTree(root);
        let viewRoot = root;
        if (initialPathParts.length > 0) {
          let curr = root;
          for (const part of initialPathParts) {
            const next = curr.children.find(c => c.name === part);
            if (!next) break;
            next.isExpanded = true;
            curr = next;
          }
          viewRoot = curr;
        }
        // Inject phantom nodes for any initial selections not in tree
        if (initialSelections.length > 0) {
          mergePhantomNodes(viewRoot, initialSelections);
        }
        setTree(viewRoot);
      } catch (err) {
        if (mounted) setError(err.message);
      }
    })();
    return () => { mounted = false; };
  }, [url, branch, initialPathParts, initialSelections]);

  const flattened = React.useMemo(() => (tree ? flattenTree(tree) : []), [tree]);

  return { tree, setTree, flattened, error, parsed };
}

module.exports = useRepoTree;