import { EOL } from 'node:os';

export async function publish(
  archiveBytes: Uint8Array,
  apiToken: string,
  oidcToken: string,
): Promise<void> {
  const response = await fetch('https://api.tessl.io/v1/tiles', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'GitHub-OIDC-Token': oidcToken,
      'Content-Type': 'application/x-tar',
    },
    body: archiveBytes,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}${EOL}${body}`,
    );
  }
}
