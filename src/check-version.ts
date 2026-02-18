import { createTesslClient, formatError } from './client';

export async function isPublishedVersion(
  tileFullName: string,
  version: string,
  apiToken: string,
): Promise<boolean> {
  const tessl = createTesslClient({ accessToken: apiToken });

  const [workspaceName, tileName] = tileFullName.split('/');

  if (!workspaceName || !tileName) {
    throw new Error(
      `Invalid tile name '${tileFullName}'. Expected format 'workspace/tile'`,
    );
  }

  const tileVersionsResponse = await tessl.GET(
    '/v1/tiles/{workspaceName}/{tileName}/versions',
    { params: { path: { workspaceName, tileName } } },
  );

  if (tileVersionsResponse.response.status === 404) {
    // Tile doesn't exist, so version can't have been published
    return false;
  }

  if (tileVersionsResponse.error) {
    throw new Error(formatError(tileVersionsResponse.error));
  }

  const existingVersions = tileVersionsResponse.data.data.map(
    (v) => v.attributes.version,
  );

  return existingVersions.includes(version);
}
