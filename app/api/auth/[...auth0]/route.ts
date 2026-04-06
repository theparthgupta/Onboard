// Auth0 v4: All /auth/* routes (login, logout, callback, profile) are
// handled automatically by the middleware in middleware.ts via auth0.middleware().
// This file exists only as a fallback for any direct /api/auth/* requests.

export async function GET() {
  return new Response('Auth routes handled by middleware', { status: 200 });
}
