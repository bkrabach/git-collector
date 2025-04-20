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

describe('handlePreviewNav horizontal scroll', () => {
  const content = ['abc', 'defghij', 'klmno'].join('\n');
  let previewHOffset;
  let setPreviewHOffset;
  const params = () => ({
    previewContent: content,
    previewOffset: 0,
    setPreviewOffset: () => {},
    contentHeight: 1,
    previewHOffset,
    setPreviewHOffset,
    width: 3
  });
  beforeEach(() => {
    previewHOffset = 2;
    setPreviewHOffset = (fn) => { previewHOffset = fn(previewHOffset); };
  });
  test('leftArrow decreases horizontal offset', () => {
    handlePreviewNav(params(), '', { leftArrow: true });
    expect(previewHOffset).toBe(1);
  });
  test('rightArrow increases horizontal offset up to max', () => {
    previewHOffset = 0;
    handlePreviewNav(params(), '', { rightArrow: true });
    expect(previewHOffset).toBe(1);
    // max offset = longest line (7) - width (3) = 4
    previewHOffset = 4;
    handlePreviewNav(params(), '', { rightArrow: true });
    expect(previewHOffset).toBe(4);
  });
  test('home sets horizontal offset to 0', () => {
    previewHOffset = 3;
    handlePreviewNav(params(), '', { home: true });
    expect(previewHOffset).toBe(0);
  });
  test('end sets horizontal offset to max', () => {
    previewHOffset = 0;
    handlePreviewNav(params(), '', { end: true });
    // max offset = 7 - 3 = 4
    expect(previewHOffset).toBe(4);
  });
  test('ctrl+left raw sequence scrolls left by fastStep', () => {
    // fastStep = floor(3 * .10) = 0 -> min 1
    previewHOffset = 4;
    handlePreviewNav(params(), '\u001b[1;2D', {});
    expect(previewHOffset).toBe(3);
  });
  test('ctrl+right raw sequence scrolls right by fastStep up to max', () => {
    const maxH = 4;
    previewHOffset = 0;
    handlePreviewNav(params(), '\u001b[1;2C', {});
    expect(previewHOffset).toBe(1);
    previewHOffset = maxH;
    handlePreviewNav(params(), '\u001b[1;2C', {});
    expect(previewHOffset).toBe(maxH);
  });
});

describe('handleTreeNav fast vertical scroll', () => {
  // simulate a tree of 20 items
  const nodes = Array.from({ length: 20 }, (_, i) => ({ node: { path: `f${i}`, type: 'blob' }, depth: 1 }));
  let params;
  beforeEach(() => {
    params = {
      flattened: nodes,
      offset: 5,
      setOffset: jest.fn((fn) => { params.offset = fn(params.offset); }),
      cursor: 6,
      setCursor: jest.fn((fn) => { params.cursor = fn(params.cursor); }),
      contentHeight: 10,
      setTree: () => {},
      toggleSelection: () => {},
      previewFile: () => {}
    };
  });
  test('shift raw up sequence scrolls up by fastV', () => {
    // fastV = floor(10*0.10)=1
    handleTreeNav(params, '\u001b[1;2A', {});
    expect(params.setOffset).toHaveBeenCalled();
    expect(params.offset).toBe(4);
    expect(params.setCursor).toHaveBeenCalled();
    expect(params.cursor).toBe(5);
  });
  test('ctrl raw down sequence scrolls down by fastV', () => {
    params.offset = 0;
    params.cursor = 0;
    handleTreeNav(params, '\u001b[1;5B', {});
    expect(params.setOffset).toHaveBeenCalled();
    expect(params.offset).toBe(1);
    expect(params.setCursor).toHaveBeenCalled();
    expect(params.cursor).toBe(1);
  });
});

describe('handlePreviewNav vertical fast scroll', () => {
  // generate 20-line content
  const content = Array.from({ length: 20 }, () => 'line').join('\n');
  let offset;
  let setPreviewOffset;
  const paramsV = () => ({ previewContent: content, previewOffset: offset, setPreviewOffset, contentHeight: 10 });
  beforeEach(() => {
    offset = 5;
    setPreviewOffset = (fn) => { offset = fn(offset); };
  });
  test('raw Shift+Up sequence scrolls up by fastV (~1)', () => {
    offset = 5;
    handlePreviewNav(paramsV(), '\u001b[1;2A', {});
    expect(offset).toBe(4);
  });
  test('raw Ctrl+Down sequence scrolls down by fastV (~1)', () => {
    offset = 0;
    handlePreviewNav(paramsV(), '\u001b[1;5B', {});
    expect(offset).toBe(1);
  });
});