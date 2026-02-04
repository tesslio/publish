import { test, expect, beforeAll, afterAll, afterEach, spyOn } from 'bun:test';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { publish } from '../src/publish.ts';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('publish sends correct request and succeeds on ok response', async () => {
  let capturedRequest: Request | undefined;

  server.use(
    http.post('https://api.tessl.io/v1/tiles', async ({ request }) => {
      capturedRequest = request.clone();
      return HttpResponse.text('', { status: 200 });
    }),
  );

  const consoleSpy = spyOn(console, 'log');
  const archiveBytes = new Uint8Array([1, 2, 3]);

  await publish(archiveBytes, 'api-token', 'oidc-token');

  expect(capturedRequest).toBeDefined();
  expect(capturedRequest!.headers.get('Authorization')).toBe(
    'Bearer api-token',
  );
  expect(capturedRequest!.headers.get('GitHub-OIDC-Token')).toBe('oidc-token');
  expect(capturedRequest!.headers.get('Content-Type')).toBe(
    'application/x-tar',
  );
  expect(new Uint8Array(await capturedRequest!.arrayBuffer())).toEqual(
    archiveBytes,
  );
  expect(consoleSpy).toHaveBeenCalledWith(
    'Successfully published tiles to Tessl API',
  );

  consoleSpy.mockRestore();
});

test('publish throws on non-ok response', async () => {
  server.use(
    http.post('https://api.tessl.io/v1/tiles', () => {
      return HttpResponse.text('Bad request', { status: 400 });
    }),
  );

  const archiveBytes = new Uint8Array([1, 2, 3]);

  await expect(
    publish(archiveBytes, 'api-token', 'oidc-token'),
  ).rejects.toThrow('API request failed: 400');
});
