import { apiBaseUrl } from './client.js';

async function getTokenRequest() {
  const response = await fetch(`${apiBaseUrl}/api/ably/token`, {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    }
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const details = body?.error ? ` ${body.error}` : '';
    throw new Error(`Unable to get Ably token from API.${details}`);
  }

  return body;
}

export async function createLiveSyncClient() {
  const { Realtime } = await import('ably');
  let initialTokenRequest = await getTokenRequest();

  return new Realtime({
    authCallback: async (_tokenParams, callback) => {
      try {
        const tokenRequest = initialTokenRequest ?? (await getTokenRequest());
        initialTokenRequest = null;
        callback(null, tokenRequest);
      } catch (error) {
        callback(error, null);
      }
    }
  });
}
