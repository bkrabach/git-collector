# Refactoring Plan for git-collector

This document outlines our next steps—deeply rooted in our minimalism and modular‑brick philosophies—to tidy the code, strengthen our vertical slices, and bolster our testing pyramid.

## 1. Tidy & Simplify

- Audit hooks/components for unused state & imports:
  - Remove leftover `entries` state & related code from App and useRepoTree
  - Prune `parseGitHubUrl`, raw fetchers, and tree-utils imports from App in favor of hooks
  - Verify each hook only exports exactly what’s needed
- Prune unused dependencies:
  - Run `npm prune` and remove any no-longer-needed packages
- Lint & format:
  - Ensure no ESLint/Prettier errors on touched files
  - (Optional) Add a `.pre-commit-config.yaml` to enforce staged linting

## 2. Strengthen Vertical Slices

- Create test fixtures under `test/fixtures/simple-repo/`:
  - `tree.json`: sample array of `{ path, type }` entries
  - `files/`: corresponding text files
- Inject fixtures into fetchers during tests (e.g. detect `fixture://` URL)
- Write integration test `test/integration.test.js`:
  - Render `<App url="fixture://simple-repo" />` with Ink’s test renderer
  - Assert TreePanel snapshot matches fixture
  - Simulate expand, select, preview; verify output updates

## 3. Bolster Testing Pyramid

- Unit tests for edge-case logic:
  - `useSelectionPersistence.toggleSelection` on file vs directory nodes
  - `useKeyboardNavigation` reactions to up/down/left/right/page keys
- End-to-end smoke test `test/smoke.test.js`:
  - Spawn `bin/cli.js fixture://simple-repo` in a pseudo-TTY (e.g. with `node-pty`)
  - Capture initial screen; assert “Files” header and fixture filenames appear

## Tracking / Progress

- [x] Defined & stabilized module interfaces (INTERFACES.md)
- [x] Extracted stateful concerns into minimal hooks/services
- [x] Added minimal testing scaffold (utils & hooks)
- [x] Implemented vertical slice: URL → fetchTree → buildTree → flattenTree → display
- [ ] Tidy & Simplify
- [ ] Strengthen vertical slices with integration fixtures & tests
- [ ] Bolster testing pyramid with unit & smoke tests
- [ ] Preserve minimal dependencies & direct integration
- [ ] Stabilize contracts for future AI‑driven regeneration
- [ ] (Optional) CI pipeline