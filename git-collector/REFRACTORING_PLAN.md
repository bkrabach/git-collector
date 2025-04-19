 # Refactoring Plan for git-collector

 This document tracks our refactoring progress to align with the Implementation and Modular Design philosophies.

 ## Tasks

 - [x] Define and stabilize module interfaces
   - [x] Catalog existing surface area and write specs for interfaces. (See INTERFACES.md)
 - [ ] Extract stateful concerns into minimal hooks/services
   - useRepoTree, useSelectionPersistence, usePreview, useKeyboardNavigation.
 - [ ] Keep each module laser-focused
 - [ ] Add minimal testing scaffold
   - Unit tests for utils/tree, utils/urlUtils.
   - Simple integration test for App or hooks.
 - [ ] Iteratively refactor by vertical slices
   - Implement slice: URL → fetchTree → buildTree → flattenTree → display.
 - [ ] Preserve minimal dependencies and direct integration
 - [ ] Stabilize contracts for future AI-generated regeneration
 - [ ] (Optional) CI pipeline

 ## Progress

 - [x] Defined and stabilized module interfaces (specs in INTERFACES.md)