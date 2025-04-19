const path = require('path');
const { spawnSync } = require('child_process');

describe('Smoke test: CLI', () => {
  test('CLI exits cleanly with fixture repo', () => {
    const bin = path.join(__dirname, '..', 'bin', 'cli.js');
    // Use a temporary destination file for output
    const os = require('os');
    const tmpFile = path.join(os.tmpdir(), `gc-smoke-${Date.now()}.md`);
    // Provide URL then quit
    const input = 'fixture://simple-repo\nq';
    const result = spawnSync('node', [bin, tmpFile], {
      encoding: 'utf8',
      input,
      timeout: 5000
    });
    expect(result.status).toBe(0);
  });
});