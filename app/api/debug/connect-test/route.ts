import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0/client';

/**
 * Debug endpoint — tests the My Account API and Connect Account flow.
 * DELETE this file before production deployment.
 */
export async function GET() {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const results: Record<string, unknown> = {
    user: session.user.email,
    hasRefreshToken: !!session.tokenSet?.refreshToken,
    accessTokenPreview: session.tokenSet?.accessToken?.substring(0, 20) + '...',
    tests: {},
  };

  // Test 1: Can we get an access token for the My Account API?
  try {
    const token = await auth0.getAccessToken({
      audience: `https://${process.env.AUTH0_DOMAIN}/me/`,
      scope: 'create:me:connected_accounts',
    });
    (results.tests as any).myAccountToken = {
      success: true,
      tokenPreview: token.token?.substring(0, 20) + '...',
      scope: token.scope,
      audience: token.audience,
    };
  } catch (e: any) {
    (results.tests as any).myAccountToken = {
      success: false,
      error: e?.message,
      code: e?.code,
    };
  }

  // Test 2: Try calling the My Account API with the My Account token (proper audience+scope)
  try {
    const myAccountToken = await auth0.getAccessToken({
      audience: `https://${process.env.AUTH0_DOMAIN}/me/`,
      scope: 'create:me:connected_accounts',
    });

    // Test GET /me/v1/connected-accounts (list)
    const listUrl = `https://${process.env.AUTH0_DOMAIN}/me/v1/connected-accounts`;
    const r1 = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${myAccountToken.token}` },
    });
    (results.tests as any).listConnectedAccounts = {
      status: r1.status,
      response: (await r1.text()).substring(0, 300),
    };

    // Test POST /me/v1/connected-accounts/connect (initiate connect)
    const connectUrl = `https://${process.env.AUTH0_DOMAIN}/me/v1/connected-accounts/connect`;
    const r2 = await fetch(connectUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${myAccountToken.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        connection: 'google-oauth2',
        redirect_uri: 'http://localhost:3000/auth/callback',
        state: 'test',
        code_challenge: 'test',
        code_challenge_method: 'S256',
        scopes: ['https://www.googleapis.com/auth/gmail.send'],
      }),
    });
    (results.tests as any).connectAccountPost = {
      status: r2.status,
      response: (await r2.text()).substring(0, 500),
    };
  } catch (e: any) {
    (results.tests as any).connectAccountTest = {
      success: false,
      error: e?.message,
    };
  }

  return NextResponse.json(results);
}
