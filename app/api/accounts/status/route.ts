import { auth0 } from '@/lib/auth0/client';
import { NextResponse } from 'next/server';

const SERVICES = ['github', 'slack', 'google-gmail', 'google-calendar'] as const;
type Service = typeof SERVICES[number];

const CONNECTION_MAP: Record<Service, string> = {
  github: 'github',
  slack: 'sign-in-with-slack',
  'google-gmail': 'google-oauth2',
  'google-calendar': 'google-oauth2',
};

/** Check whether fallback env-var credentials are present for a service */
function hasFallbackCredential(service: Service): boolean {
  switch (service) {
    case 'github':
      return !!process.env.GITHUB_TOKEN;
    case 'slack':
      return !!process.env.SLACK_BOT_TOKEN;
    case 'google-gmail':
    case 'google-calendar':
      return !!(process.env.GOOGLE_REFRESH_TOKEN && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  }
}

export async function GET() {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({}, { status: 401 });

  const result: Record<string, { connected: boolean; source: 'token-vault' | 'fallback' | 'none' }> = {};

  await Promise.all(
    SERVICES.map(async (service) => {
      // 1. Try Token Vault first
      try {
        const connection = CONNECTION_MAP[service];
        const tv = await auth0.getAccessTokenForConnection({ connection });
        if (tv?.token) {
          result[service] = { connected: true, source: 'token-vault' };
          return;
        }
      } catch {
        // Token Vault not configured — fall through
      }

      // 2. Check fallback env credentials
      if (hasFallbackCredential(service)) {
        result[service] = { connected: true, source: 'fallback' };
        return;
      }

      result[service] = { connected: false, source: 'none' };
    })
  );

  return NextResponse.json(result);
}
