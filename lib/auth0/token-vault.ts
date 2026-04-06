import { auth0 } from './client';
import { AuditEntry, Platform, TokenEntry } from '../types';

export type SupportedService = 'github' | 'slack' | 'google-gmail' | 'google-calendar';

/**
 * Maps our internal service names to Auth0 connection identifiers.
 * These must match the connection "Name" in Auth0 Dashboard → Authentication → Social.
 */
const CONNECTION_NAME_MAP: Record<SupportedService, string> = {
  github:           'github',
  slack:            'sign-in-with-slack',
  'google-gmail':   'google-oauth2',
  'google-calendar':'google-oauth2',
};

/**
 * Fallback credential tokens used when Auth0 Token Vault is not available.
 * For Google services: exchanges a stored refresh token for a fresh access token.
 * In production with Token Vault: this path is never reached.
 */
async function getFallbackToken(service: SupportedService): Promise<string | null> {
  switch (service) {
    case 'github':
      return process.env.GITHUB_TOKEN ?? null;
    case 'slack':
      return process.env.SLACK_BOT_TOKEN ?? null;
    case 'google-gmail':
    case 'google-calendar': {
      const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
      if (!refreshToken) return null;
      try {
        const res = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type:    'refresh_token',
            refresh_token: refreshToken,
            client_id:     process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        });
        const data = await res.json();
        if (data.access_token) {
          console.log(`[token-vault] ✓ Google access token refreshed for ${service}`);
          return data.access_token;
        }
        console.error('[token-vault] Google refresh failed:', data.error);
        return null;
      } catch (e) {
        console.error('[token-vault] Google refresh error:', e);
        return null;
      }
    }
    default:
      return null;
  }
}

/**
 * Attempt to get a scoped token for a service via Auth0 Token Vault.
 * Token Vault stores tokens from the user's connected social accounts
 * (Google, GitHub, Slack) and issues short-lived scoped access tokens.
 *
 * Falls back to env-var credentials if Token Vault is unavailable
 * (e.g. user not connected via that social provider, or plan limitation).
 */
export async function getTokenForService(service: SupportedService): Promise<TokenEntry> {
  const connection = CONNECTION_NAME_MAP[service];

  // ── 1. Try Auth0 Token Vault ─────────────────────────────────────────────
  try {
    const result = await auth0.getAccessTokenForConnection({ connection });
    if (result?.token) {
      console.log(`[token-vault] ✅ Token Vault issued ${service} token (${result.token.substring(0, 20)}...)`);
      return { token: result.token, source: 'token-vault' };
    }
    console.warn(`[token-vault] Token Vault returned empty token for ${service}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[token-vault] Token Vault unavailable for ${service}: ${msg}`);
  }

  // ── 2. Fallback: env-var credentials ────────────────────────────────────
  const fallbackToken = await getFallbackToken(service);
  if (fallbackToken) {
    console.warn(`[token-vault] ⚠️  Using fallback credential for ${service}`);
    return { token: fallbackToken, source: 'fallback' };
  }

  throw new Error(
    `No token available for ${service}. ` +
    `Connect your ${connection} account via Auth0 Token Vault or provide a credential in .env.local.`
  );
}

/**
 * Fetch all needed tokens upfront in the API route (where session context is available).
 * Runs all fetches in parallel for maximum speed.
 */
export async function fetchAllConnectionTokens(
  services: SupportedService[]
): Promise<Record<string, TokenEntry>> {
  const results = await Promise.allSettled(
    services.map(async (service) => ({ service, entry: await getTokenForService(service) }))
  );

  const tokens: Record<string, TokenEntry> = {};
  for (const result of results) {
    if (result.status === 'fulfilled') {
      tokens[result.value.service] = result.value.entry;
    } else {
      console.error('[token-vault] Token fetch failed:', result.reason?.message);
    }
  }
  return tokens;
}

/**
 * Extract a token from the pre-fetched map and emit a rich audit entry.
 * Agents call this — tokens were fetched in the route handler before agents started.
 * The audit entry accurately reflects whether Auth0 Token Vault was used.
 */
export function getTokenFromMap(
  tokenMap: Record<string, TokenEntry>,
  service: SupportedService,
  actionDescription: string
): { token: string; auditEntry: AuditEntry } {
  const entry = tokenMap[service];
  if (!entry) {
    throw new Error(
      `No token for ${service}. Connect this account via Auth0 Token Vault or configure credentials in .env.local.`
    );
  }

  const platformMap: Record<SupportedService, Platform> = {
    github:           'github',
    slack:            'slack',
    'google-gmail':   'gmail',
    'google-calendar':'calendar',
  };

  const isVault = entry.source === 'token-vault';

  return {
    token: entry.token,
    auditEntry: {
      timestamp: new Date(),
      action: isVault
        ? `🔐 Auth0 Token Vault — ${actionDescription}`
        : `🔑 Fallback credential — ${actionDescription}`,
      platform: platformMap[service],
      details: isVault
        ? `Auth0 Token Vault issued a short-lived scoped ${service} token for: ${actionDescription}`
        : `Env-var fallback credential used for ${service} (configure Token Vault connection in Auth0 Dashboard to upgrade)`,
      tokenScope: `${service}${isVault ? ':token-vault' : ':fallback'}`,
    },
  };
}
