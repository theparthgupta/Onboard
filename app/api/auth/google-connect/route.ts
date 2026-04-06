import { NextRequest, NextResponse } from 'next/server';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar',
  'email',
  'profile',
].join(' ');

// Step 1: redirect to Google
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (code) {
    // Step 2: exchange code for tokens
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.APP_BASE_URL}/api/auth/google-connect`,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await res.json();
    if (tokens.error) {
      return NextResponse.json({ error: tokens.error, detail: tokens.error_description }, { status: 400 });
    }

    const html = `
      <html><body style="font-family:monospace;padding:2rem;background:#0f172a;color:#e2e8f0">
        <h2 style="color:#34d399">✅ Google connected!</h2>
        <p>Add this to your <code>.env.local</code>:</p>
        <pre style="background:#1e293b;padding:1rem;border-radius:8px;overflow:auto">GOOGLE_REFRESH_TOKEN=${tokens.refresh_token ?? '(none — revoke access at myaccount.google.com and try again)'}
GOOGLE_ACCESS_TOKEN=${tokens.access_token}</pre>
        <p style="color:#94a3b8">Then restart the dev server. Close this tab when done.</p>
      </body></html>
    `;
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
  }

  // Step 1: build Google OAuth URL
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.APP_BASE_URL}/api/auth/google-connect`,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',  // force new refresh token
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
