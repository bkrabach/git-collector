 # Module Interface Specifications

 This document defines public interfaces ("brick studs and sockets") for each core module in git-collector.

 1. **CLI Entry (bin/cli.js)**
    - **Inputs**: `repoUrl` (string)
    - **Behavior**: Renders the Ink-based `App` component with `{ url: repoUrl }`
    - **Outputs**: Exits process with code 1 if `repoUrl` is missing
    - **Failure Modes**: Missing argument

 2. **URL Parser (src/utils/urlUtils.js)**
    - **Function**: `parseGitHubUrl(repoUrl: string) -> { owner, repo, branch, initialPathParts }`
    - **Inputs**: `repoUrl` (string)
    - **Outputs**: Parsed owner, repo, branch (optional), and path segments
    - **Failure Modes**: Throws `Error` for invalid URL or unsupported host

 3. **Project Tree Fetcher (src/utils/fetchers.js)**
    - **Function**: `fetchTree(repoUrl: string, refOverride?: string) -> Array<{path: string, type: 'blob'|'tree'}>`
    - **Inputs**: GitHub repo URL, optional ref (branch/commit)
    - **Behavior**: Calls GitHub API `/git/trees/:ref?recursive=1`
    - **Outputs**: Array of tree entries
    - **Failure Modes**: Throws `Error` for network/API failures, invalid URL

 4. **File Content Fetcher (src/utils/fetchers.js)**n+    - **Function**: `fetchContent(repoUrl: string, filePath: string) -> string`
    - **Inputs**: GitHub repo URL, file path
    - **Behavior**: Calls GitHub API `/contents/:path`
    - **Outputs**: File content as UTF-8 string
    - **Failure Modes**: Throws `Error` for network/API failures, unsupported encoding

 5. **Tree Utilities (src/utils/tree.js)**
    - **Functions**:
      - `buildTree(entries) -> TreeNode`
      - `sortTree(node: TreeNode) -> void`
      - `flattenTree(node: TreeNode, depth?: number) -> Array<{node, depth}>`
      - `getDescendantPaths(node: TreeNode) -> string[]`
    - **Behavior**: Build, sort, and traverse directory trees
    - **Failure Modes**: N/A (pure functions)

 6. **Main App Component (src/app.js)**
    - **Component**: `App({ url: string })`
    - **Props**: `url` (GitHub repository URL)
    - **State**:
      - `entries`, `tree` (in-memory file tree)
      - `selected`, `prevSelected` (file selection sets)
      - `cursor`, `offset`, `focus`, preview state
    - **Behavior**: Fetch and display repo tree; allow keyboard navigation and selection; fetch file previews; persist selection to `~/.git-collector/<...>.json`
    - **Failure Modes**: Displays error message on fetch or parse failures

 7. **Presentation Components (src/components)**
    - **TreePanel**
      - Props: `{ visible, offset, listHeight, depthOffset, selected, prevSelected, cursor, leftWidth, focus }`
    - **PreviewPanel**
      - Props: `{ previewContent, previewTitle, listHeight, previewOffset, focus, width }`

 All interfaces are considered stable contracts for incremental refactoring and future AI-driven regeneration.