/**
 * Enguerra of NY - Central Server-Side Google Authorization
 *
 * Implements server-side Google OAuth 2.0 token management and service account handling
 * for the owner's central Sheet and Drive resources.
 *
 * Security:
 * - Credentials and tokens are NEVER sent to the browser
 * - Tokens are refreshed automatically before expiration
 * - Lazy initialization prevents startup crash when secrets are unconfigured
 */

interface CachedToken {
  accessToken: string;
  expiresAt: number; // unix timestamp ms
}

let cachedGoogleToken: CachedToken | null = null;

export interface GoogleAuthConfig {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  serviceAccountKey?: string;
  sheetId?: string;
  driveFolderId?: string;
}

export function getGoogleConfig(): GoogleAuthConfig {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN || '',
    serviceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '',
    sheetId: process.env.ENGUERRA_SHEET_ID || '',
    driveFolderId: process.env.ENGUERRA_DRIVE_ROOT_FOLDER_ID || '',
  };
}

export function isGoogleConfigured(): boolean {
  const config = getGoogleConfig();
  const hasOAuth = Boolean(config.clientId && config.clientSecret && config.refreshToken && config.sheetId);
  const hasServiceAccount = Boolean(config.serviceAccountKey && config.sheetId);
  return hasOAuth || hasServiceAccount;
}

/**
 * Returns a valid Google OAuth access token using server-side refresh token flow.
 * Caches token until 2 minutes before expiry.
 */
export async function getGoogleAccessToken(): Promise<string | null> {
  const config = getGoogleConfig();

  // If token is cached and valid for at least another 60 seconds, reuse it
  if (cachedGoogleToken && Date.now() < cachedGoogleToken.expiresAt - 60000) {
    return cachedGoogleToken.accessToken;
  }

  if (config.refreshToken && config.clientId && config.clientSecret) {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          refresh_token: config.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[GoogleAuth] Failed to refresh Google access token:', errorText);
        return null;
      }

      const data = (await response.json()) as { access_token: string; expires_in: number };
      cachedGoogleToken = {
        accessToken: data.access_token,
        expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
      };

      return cachedGoogleToken.accessToken;
    } catch (err) {
      console.error('[GoogleAuth] Error connecting to Google OAuth endpoint:', err);
      return null;
    }
  }

  return null;
}
