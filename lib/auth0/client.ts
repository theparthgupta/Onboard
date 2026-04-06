import { Auth0Client } from '@auth0/nextjs-auth0/server';

/**
 * Auth0 client configured for Token Vault + CIBA.
 *
 * Token Vault stores the access tokens from social connections the user
 * authenticates with. For our agents to call Gmail, Calendar, GitHub and
 * Slack on the user's behalf, we request those scopes during login so
 * Auth0 Token Vault can store and serve them later.
 *
 * Dashboard setup required (one-time):
 *  1. Auth0 Dashboard → Authentication → Social → google-oauth2
 *     → Enable "Store user tokens" (Token Vault)
 *     → Add scopes: gmail.send, calendar.events, calendar.freebusy
 *  2. Auth0 Dashboard → Authentication → Social → github
 *     → Enable "Store user tokens" (Token Vault)
 *     → Add scopes: repo, admin:org, read:user
 *  3. Users must re-login once to grant the new scopes.
 */
export const auth0 = new Auth0Client({
  domain:       process.env.AUTH0_DOMAIN!,
  clientId:     process.env.AUTH0_CLIENT_ID!,
  clientSecret: process.env.AUTH0_CLIENT_SECRET!,
  secret:       process.env.AUTH0_SECRET!,
  appBaseUrl:   process.env.APP_BASE_URL ?? 'http://localhost:3000',

  // Enable the /auth/connect endpoint so the Connect Account flow works.
  enableConnectAccountEndpoint: true,

  authorizationParameters: {
    // Core OIDC + offline_access so Auth0 gets a refresh token from the provider
    scope: 'openid profile email offline_access',

    // Force login via Google directly so Token Vault captures the Google token.
    connection: 'google-oauth2',

    // Force re-consent so Google issues a refresh token (required for Token Vault)
    access_type: 'offline',
    prompt: 'consent',

    // Request Gmail + Calendar scopes from Google during login.
    // Auth0 Token Vault stores these scoped tokens per user.
    connection_scope: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.freebusy',
    ].join(' '),
  },
});
