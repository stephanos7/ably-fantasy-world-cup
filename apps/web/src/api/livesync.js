import { apiBaseUrl } from './client.js';

function logLiveSync(message, details) {
  if (import.meta.env.DEV) {
    console.info(`[LiveSync] ${message}`, details ?? '');
  }
}

async function getTokenRequest() {
  logLiveSync('requesting Ably token');

  const response = await fetch(`${apiBaseUrl}/api/ably/token`, {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    }
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const details = body?.error ? ` ${body.error}` : '';
    logLiveSync('Ably token request failed', { status: response.status, error: body?.error });
    throw new Error(`Unable to get Ably token from the Netlify Function.${details}`);
  }

  logLiveSync('Ably token request succeeded', { keyName: body?.keyName, ttl: body?.ttl });
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
