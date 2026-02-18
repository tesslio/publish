import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
} from 'bun:test';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { isPublishedVersion } from '../src/check-version.ts';

const BASE_URL = 'https://api.tessl.io';

function versionsUrl(workspace: string, tile: string) {
  return `${BASE_URL}/v1/tiles/${workspace}/${tile}/versions`;
}

function makeVersionEntry(version: string) {
  return {
    id: crypto.randomUUID(),
    type: 'tile-version' as const,
    attributes: {
      fingerprint: 'abc123',
      version,
      major: 0,
      minor: 1,
      patch: 0,
      prerelease: null,
      describes: null,
      archived: false,
      archivedAt: null,
      archivedBy: null,
      archivedReason: null,
      docs: null,
      steering: null,
      hasSteering: false,
      hasSkills: false,
      hasDocs: false,
      summary: '',
      tesslVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      evalScore: null,
      evalBaselineScore: null,
      evalImprovement: null,
      evalImprovementMultiplier: null,
    },
    relationships: {
      tile: {
        data: { id: crypto.randomUUID(), type: 'tile' as const },
        links: { self: `${BASE_URL}/v1/tiles/my-workspace/my-tile` },
      },
    },
    links: {
      self: `${BASE_URL}/v1/tiles/my-workspace/my-tile/versions/${version}`,
    },
  };
}

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('isPublishedVersion', () => {
  test('returns false when the version does not exist', async () => {
    server.use(
      http.get(versionsUrl('my-workspace', 'my-tile'), () =>
        HttpResponse.json({
          links: {
            self: versionsUrl('my-workspace', 'my-tile'),
            next: null,
            prev: null,
          },
          meta: { count: 1 },
          data: [makeVersionEntry('0.1.0')],
        }),
      ),
    );

    const result = await isPublishedVersion(
      'my-workspace/my-tile',
      '0.2.0',
      'test-token',
    );
    expect(result).toBe(false);
  });

  test('returns true when the version already exists', async () => {
    server.use(
      http.get(versionsUrl('my-workspace', 'my-tile'), () =>
        HttpResponse.json({
          links: {
            self: versionsUrl('my-workspace', 'my-tile'),
            next: null,
            prev: null,
          },
          meta: { count: 2 },
          data: [makeVersionEntry('0.1.0'), makeVersionEntry('0.2.0')],
        }),
      ),
    );

    const result = await isPublishedVersion(
      'my-workspace/my-tile',
      '0.2.0',
      'test-token',
    );
    expect(result).toBe(true);
  });

  test('returns false when no versions exist', async () => {
    server.use(
      http.get(versionsUrl('my-workspace', 'my-tile'), () =>
        HttpResponse.json({
          links: {
            self: versionsUrl('my-workspace', 'my-tile'),
            next: null,
            prev: null,
          },
          meta: { count: 0 },
          data: [],
        }),
      ),
    );

    const result = await isPublishedVersion(
      'my-workspace/my-tile',
      '1.0.0',
      'test-token',
    );
    expect(result).toBe(false);
  });

  test('throws on invalid tile name without separator', async () => {
    await expect(
      isPublishedVersion('invalid-name', '1.0.0', 'token'),
    ).rejects.toThrow(
      "Invalid tile name 'invalid-name'. Expected format 'workspace/tile'",
    );
  });

  test('throws on invalid tile name with empty workspace', async () => {
    await expect(isPublishedVersion('/tile', '1.0.0', 'token')).rejects.toThrow(
      "Invalid tile name '/tile'. Expected format 'workspace/tile'",
    );
  });

  test('throws on API error response', async () => {
    server.use(
      http.get(versionsUrl('my-workspace', 'my-tile'), () =>
        HttpResponse.json(
          {
            errors: [
              {
                title: 'Internal Server Error',
                status: '500',
                detail: 'Something went wrong',
              },
            ],
          },
          { status: 500 },
        ),
      ),
    );

    await expect(
      isPublishedVersion('my-workspace/my-tile', '1.0.0', 'token'),
    ).rejects.toThrow('[500 Internal Server Error]: Something went wrong');
  });
});
