import { getIDToken } from '@actions/core';

import { createArchive } from './archive';
import { publish } from './publish';

async function main(): Promise<void> {
  const path = process.argv[2] || '.';

  const apiToken = process.env.TESSL_API_TOKEN;
  if (!apiToken) {
    throw new Error('TESSL_API_TOKEN environment variable is required');
  }

  console.log(`Creating archive from '${path}'`);
  const archiveBytes = await createArchive(path);
  console.log(`Archive created (${archiveBytes.length} bytes)`);

  console.log('Publishing to Tessl API...');
  const oidcToken = await getIDToken('api.tessl.io');
  await publish(archiveBytes, apiToken, oidcToken);
}

main().catch((error: unknown) => {
  console.error('Error:', error instanceof Error ? error.message : error);
  process.exit(1);
});
