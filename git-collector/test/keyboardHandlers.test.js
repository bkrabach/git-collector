const { handleTreeNav, handlePreviewNav } = require('../src/hooks/keyboardHandlers');

describe('handleTreeNav', () => {
  let params;
  const node = { type: 'blob', path: 'file1.txt', missing: false };
  beforeEach(() => {
    params = {
      flattened: [{ node, depth: 1 }],
      offset: 0,
      setOffset: jest.fn(),
      cursor: 0,
      setCursor: jest.fn(),
      contentHeight: 5,
      setTree: jest.fn(),
      toggleSelection: jest.fn(),
      previewFile: jest.fn()
    };
  });

  test('space toggles selection for a blob node', () => {
    handleTreeNav(params, ' ', {});
    expect(params.toggleSelection).toHaveBeenCalledWith(node);
  });

  test('return calls previewFile for a blob node', () => {
    handleTreeNav(params, '', { return: true });
    expect(params.previewFile).toHaveBeenCalledWith(node);
  });

  test('up arrow moves cursor up and adjusts offset', () => {
    // simulate two items for movement
    const node2 = { type: 'blob', path: 'file2.txt', missing: false };
    params.flattened = [{ node: node2, depth: 1 }, { node, depth: 1 }];
    params.cursor = 1;
    params.offset = 1;
    handleTreeNav(params, '', { upArrow: true });
    expect(params.setCursor).toHaveBeenCalledWith(0);
    expect(params.setOffset).toHaveBeenCalledWith(0);
  });
});

describe('handlePreviewNav', () => {
  const content = ['line1', 'line2', 'line3'].join('\n');
  let offset;
  let setPreviewOffset;
  const previewParams = () => ({ previewContent: content, previewOffset: offset, setPreviewOffset, contentHeight: 1 });

  beforeEach(() => {
    offset = 1;
    setPreviewOffset = (fn) => { offset = fn(offset); };
  });

  test('down arrow increases previewOffset up to max', () => {
    handlePreviewNav(previewParams(), '', { downArrow: true });
    expect(offset).toBe(2);
  });

  test('up arrow decreases previewOffset down to 0', () => {
    offset = 2;
    handlePreviewNav(previewParams(), '', { upArrow: true });
    expect(offset).toBe(1);
  });
});