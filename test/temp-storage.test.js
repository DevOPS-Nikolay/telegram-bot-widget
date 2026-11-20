const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { cleanupExpiredTempFiles, TEMP_FILE_TTL_MS } = require('../server');

function createTempFixtureDirectory() {
  const directoryPath = path.join(__dirname, 'fixtures-temp');
  fs.rmSync(directoryPath, { recursive: true, force: true });
  fs.mkdirSync(directoryPath, { recursive: true });
  return directoryPath;
}

test('temporary upload folder removes files older than 24 hours', () => {
  const directoryPath = createTempFixtureDirectory();
  const freshFile = path.join(directoryPath, 'fresh.txt');
  const staleFile = path.join(directoryPath, 'stale.txt');
  const now = Date.now();

  fs.writeFileSync(freshFile, 'fresh');
  fs.writeFileSync(staleFile, 'stale');

  fs.utimesSync(staleFile, new Date(now - (TEMP_FILE_TTL_MS + 60 * 1000)), new Date(now - (TEMP_FILE_TTL_MS + 60 * 1000)));

  const deletedFiles = cleanupExpiredTempFiles(directoryPath, TEMP_FILE_TTL_MS);

  assert.equal(fs.existsSync(staleFile), false);
  assert.equal(fs.existsSync(freshFile), true);
  assert.ok(deletedFiles.includes(staleFile));

  fs.rmSync(directoryPath, { recursive: true, force: true });
});
