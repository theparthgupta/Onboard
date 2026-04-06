import { auth0 } from '@/lib/auth0/client';
import { NextRequest } from 'next/server';

// Scopes to request for each connection
const CONNECTION_SCOPES: Record<string, string[]> = {
  github: ['read:user', 'repo', 'read:org', 'write:org'],
  'sign-in-with-slack': ['chat:write', 'users:read', 'channels:read', 'im:write'],
  'google-oauth2': [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar',
  ],
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ connection: string }> }
) {
  const { connection } = await params;
  const scopes = CONNECTION_SCOPES[connection] ?? [];

  try {
    return await auth0.connectAccount({
      connection,
      scopes,
      returnTo: '/dashboard/accounts',
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? `${e.name}: ${e.message}\n${e.stack}` : String(e);
    console.error('[connect] connectAccount error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
