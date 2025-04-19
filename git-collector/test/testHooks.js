const assert = require('assert');

// Hook existence smoke tests
assert.strictEqual(typeof require('../src/hooks/useRepoTree'), 'function', 'useRepoTree should export a function');
assert.strictEqual(typeof require('../src/hooks/useSelectionPersistence'), 'function', 'useSelectionPersistence should export a function');
assert.strictEqual(typeof require('../src/hooks/usePreview'), 'function', 'usePreview should export a function');
assert.strictEqual(typeof require('../src/hooks/useKeyboardNavigation'), 'function', 'useKeyboardNavigation should export a function');

console.log('testHooks passed');