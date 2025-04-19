const path = require('path');
const { spawnSync } = require('child_process');

describe('Smoke test: CLI', () => {
  test('CLI exits cleanly with fixture repo', () => {
    const bin = path.join(__dirname, '..', 'bin', 'cli.js');
    const result = spawnSync('node', [bin, 'fixture://simple-repo'], {
      encoding: 'utf8',
      input: 'q',
      timeout: 5000
    });
    expect(result.status).toBe(0);
  });
});