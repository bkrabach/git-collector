const { mergePhantomNodes } = require('../src/utils/phantomTree');

describe('mergePhantomNodes', () => {
  test('injects missing ancestor directories and files', () => {
    // Start with a minimal empty root
    const root = { name: '', path: '', type: 'tree', children: [], isExpanded: false };
    const selections = ['foo/bar.txt'];
    const result = mergePhantomNodes(root, selections);
    // Expect 'foo' directory injected
    const foo = result.children.find((c) => c.name === 'foo');
    expect(foo).toBeDefined();
    expect(foo.type).toBe('tree');
    expect(foo.path).toBe('foo');
    expect(foo.missing).toBe(true);
    expect(foo.isExpanded).toBe(true);
    // Expect 'bar.txt' file under 'foo'
    const bar = foo.children.find((c) => c.name === 'bar.txt');
    expect(bar).toBeDefined();
    expect(bar.type).toBe('blob');
    expect(bar.path).toBe('foo/bar.txt');
    expect(bar.missing).toBe(true);
  });
});