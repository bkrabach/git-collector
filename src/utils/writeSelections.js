const fs = require('fs');
const { fetchContent } = require('./githubClient');
const { parseGitHubUrl } = require('./urlUtils');

/**
 * Serialize selected files from a repository into a Markdown document
 * and write it to the given destination path.
 * @param {Object} params
 * @param {string} params.url - Repository URL
 * @param {string} params.destPath - Output file path
 * @param {Iterable<string>} params.selected - Set of selected file paths
 * @param {Array<{node: object}>} params.flattened - Flattened tree entries
 * @returns {Promise<void>}
 */
async function writeSelections({ url, destPath, selected, flattened, tree }) {
  // Filter selected file paths against the full tree (exclude missing/binary)
  const { getDescendantPaths } = require('./tree');
  const realPaths = new Set(getDescendantPaths(tree));
  const paths = Array.from(selected).filter((p) => realPaths.has(p)).sort();
  const lines = [];
  // Header: repo/path title and tool marker
  const { owner, repo, initialPathParts } = parseGitHubUrl(url);
  const title = `${owner}/${repo}${initialPathParts.length ? '/' + initialPathParts.join('/') : ''}`;
  lines.push(`# ${title}`);
  lines.push('');
  lines.push('[git-collector-data]');
  lines.push('');
  // Metadata lines
  lines.push(`**URL:** ${url}  `);
  lines.push(`**Date:** ${new Date().toLocaleString()}  `);
  lines.push(`**Files:** ${paths.length}  `);
  lines.push('');
  for (const filePath of paths) {
    lines.push(`=== File: ${filePath} ===`);
    try {
      const content = await fetchContent(url, filePath);
      lines.push(content);
    } catch (err) {
      lines.push(`// Error loading file: ${err.message}`);
    }
    lines.push('');
  }
  // Write output synchronously for simplicity
  fs.writeFileSync(destPath, lines.join('\n'), 'utf8');
}

module.exports = { writeSelections };