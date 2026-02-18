import { test, expect } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createArchive } from '../src/archive.ts';

test('createArchive returns bytes for directory with matching files', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'archive-test-'));
  try {
    await Bun.write(join(tempDir, 'test.md'), '# Hello');
    await Bun.write(join(tempDir, 'script.js'), 'console.log("hi")');

    const result = await createArchive(tempDir);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  } finally {
    await rm(tempDir, { recursive: true });
  }
});

test('createArchive throws when no matching files found', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'archive-test-'));
  try {
    await Bun.write(join(tempDir, 'ignored.xml'), '<root/>');

    await expect(createArchive(tempDir)).rejects.toThrow('No files found');
  } finally {
    await rm(tempDir, { recursive: true });
  }
});
