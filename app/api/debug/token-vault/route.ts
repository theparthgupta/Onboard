import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0/client';

/**
 * Diagnostic endpoint — checks Token Vault status for all connections.
 * Shows what's in the session and whether Token Vault tokens are available.
 * DELETE this file before production deployment.
 */
export async function GET() {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const connections = ['google-oauth2', 'github', 'sign-in-with-slack'];
  const results: Record<string, unknown> = {
    user: session.user.email,
    connectionTokenSets: session.connectionTokenSets?.map(ts => ({
      connection: ts.connection,
      hasAccessToken: !!ts.accessToken,
      expiresAt: ts.expiresAt,
    })) ?? [],
    tokenVaultResults: {},
  };

  // Try each connection
  for (const connection of connections) {
    try {
      const result = await auth0.getAccessTokenForConnection({ connection });
      (results.tokenVaultResults as Record<string, unknown>)[connection] = {
        success: true,
        hasToken: !!result?.token,
        tokenPreview: result?.token ? result.token.substring(0, 20) + '...' : null,
      };
    } catch (e: any) {
      (results.tokenVaultResults as Record<string, unknown>)[connection] = {
        success: false,
        error: e?.message,
        errorCode: e?.code,
        // Inner OAuth2 error from Auth0's token endpoint
        auth0ErrorCode: e?.cause?.code ?? e?.cause?.error,
        auth0ErrorDesc: e?.cause?.message ?? e?.cause?.error_description,
      };
    }
  }

  return NextResponse.json(results, { status: 200 });
}
