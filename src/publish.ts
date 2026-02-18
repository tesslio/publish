import { createTesslClient, formatError } from './client';

export async function publish(
  archiveBytes: Uint8Array,
  apiToken: string,
  oidcToken: string,
): Promise<void> {
  const tessl = createTesslClient({ accessToken: apiToken });
  const postTileResponse = await tessl.POST('/v1/tiles', {
    // The client types are incorrect here
    body: archiveBytes as never,
    bodySerializer: (body) => body as unknown as Blob,
    params: {
      header: {
        'content-type': 'application/x-tar',
        'github-oidc-token': oidcToken,
      },
    },
  });

  if (postTileResponse.error) {
    throw new Error(formatError(postTileResponse.error));
  }

  return;
}
