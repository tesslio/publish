import { getIDToken } from '@actions/core';
import { join } from 'node:path';

import { createArchive } from './archive.ts';
import { isPublishedVersion } from './check-version.ts';
import { publish } from './publish.ts';

async function main(): Promise<void> {
  const path = process.argv[2] || '.';

  const apiToken = process.env.TESSL_API_TOKEN;
  if (!apiToken) {
    throw new Error('TESSL_API_TOKEN environment variable is required');
  }

  const tileManifestPath = join(path, 'tile.json');
  let tileManifest: unknown;
  try {
    tileManifest = await Bun.file(tileManifestPath).json();
  } catch {
    throw new Error(
      `Missing or invalid tile manifest at '${tileManifestPath}'`,
    );
  }

  if (
    typeof tileManifest !== 'object' ||
    tileManifest === null ||
    !('name' in tileManifest) ||
    typeof tileManifest.name !== 'string'
  ) {
    throw new Error(
      `Tile manifest must contain a 'name' property of type string`,
    );
  }

  if (
    !('version' in tileManifest) ||
    typeof tileManifest.version !== 'string'
  ) {
    throw new Error(
      `Tile manifest must contain a 'version' property of type string`,
    );
  }

  const tileFullName = tileManifest.name;
  const tileVersion = tileManifest.version;

  const isPublished = await isPublishedVersion(
    tileFullName,
    tileVersion,
    apiToken,
  );

  if (isPublished) {
    console.log(
      `Tile '${tileFullName}@${tileVersion}' has already been published. Skipping publish step`,
    );
    return;
  }

  console.log(
    `Publishing tile '${tileFullName}@${tileVersion}' from path '${path}'`,
  );

  console.log(`Creating archive...`);
  const archiveBytes = await createArchive(path);
  console.log(`Archive created (${archiveBytes.length} bytes)`);

  console.log('Publishing to Tessl API...');
  const oidcToken = await getIDToken('api.tessl.io');
  await publish(archiveBytes, apiToken, oidcToken);
  console.log('Publish complete');
}

main().catch((error: unknown) => {
  console.error('Error:', error instanceof Error ? error.message : error);
  process.exit(1);
});
