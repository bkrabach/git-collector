describe('Hook existence', () => {
  const hooks = [
    ['useRepoTree', '../src/hooks/useRepoTree'],
    ['useSelectionPersistence', '../src/hooks/useSelectionPersistence'],
    ['usePreview', '../src/hooks/usePreview'],
    ['useKeyboardNavigation', '../src/hooks/useKeyboardNavigation']
  ];

  hooks.forEach(([name, path]) => {
    test(`${name} should export a function`, () => {
      const hook = require(path);
      expect(typeof hook).toBe('function');
    });
  });
});