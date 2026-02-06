import { createTesslClient } from './client';

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

  if ('error' in tileVersionsResponse) {
    const err = tileVersionsResponse.error?.errors[0]!;
    throw new Error(
      `Failed to fetch existing tile versions: ${err.title} ${err.detail}`,
    );
  }

  const existingVersions = tileVersionsResponse.data.data.map(
    (v) => v.attributes.version,
  );

  return existingVersions.includes(version);
}
