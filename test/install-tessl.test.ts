import { test, expect, mock, beforeEach } from 'bun:test';

import { installTessl } from '../src/install-tessl.ts';

const originalSpawnSync = Bun.spawnSync;
const originalSpawn = Bun.spawn;

beforeEach(() => {
  Bun.spawnSync = originalSpawnSync;
  Bun.spawn = originalSpawn;
});

test('skips install when tessl is already in PATH', async () => {
  // @ts-expect-error — mocking
  Bun.spawnSync = mock(() => ({ exitCode: 0 }));
  const spawnMock = mock(() => ({
    exited: Promise.resolve(0),
  }));
  // @ts-expect-error — mocking
  Bun.spawn = spawnMock;

  await installTessl();

  expect(spawnMock).not.toHaveBeenCalled();
});

test('runs curl install when tessl is not found', async () => {
  // @ts-expect-error — mocking
  Bun.spawnSync = mock(() => ({ exitCode: 1 }));
  const spawnMock = mock(() => ({
    exited: Promise.resolve(0),
  }));
  // @ts-expect-error — mocking
  Bun.spawn = spawnMock;

  await installTessl();

  expect(spawnMock).toHaveBeenCalledWith(
    ['sh', '-c', 'curl -fsSL https://get.tessl.io | sh'],
    expect.any(Object),
  );
});

test('throws when install fails', async () => {
  // @ts-expect-error — mocking
  Bun.spawnSync = mock(() => ({ exitCode: 1 }));
  // @ts-expect-error — mocking
  Bun.spawn = mock(() => ({
    exited: Promise.resolve(1),
  }));

  await expect(installTessl()).rejects.toThrow(
    'Failed to install tessl CLI (exit code 1)',
  );
});
