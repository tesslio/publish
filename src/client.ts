import type { HeadersOptions } from 'openapi-fetch';

import createClient from 'openapi-fetch';

import type { paths } from './client-types.ts';

export function createTesslClient(opts?: { accessToken?: string }) {
  const headers: HeadersOptions = {};

  if (opts?.accessToken) {
    headers['Authorization'] = `Bearer ${opts.accessToken}`;
  }

  const client = createClient<paths, 'application/json'>({
    baseUrl: 'https://api.tessl.io',
    headers,
  });

  return client;
}

export function formatError(error: {
  errors: {
    title: string;
    status: string;
    detail: string;
  }[];
}) {
  const err = error.errors[0];

  if (!err) {
    return 'Unknown error';
  }

  return `[${err.status} ${err.title}]: ${err.detail}`;
}
