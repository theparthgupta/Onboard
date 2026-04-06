/**
 * CIBA = Client-Initiated Backchannel Authentication
 *
 * Used when the agent needs to perform a HIGH-STAKES action and requires
 * explicit out-of-band human approval (push notification via Auth0 Guardian).
 *
 * In Onboard: used exclusively for granting production system access.
 * The production agent has NO credentials — it can only ask.
 */

export async function requestProductionAccessApproval(params: {
  userId: string;
  newHireName: string;
  accessLevel: string;
  jobId: string;
}): Promise<{ requestId: string; expiresIn: number }> {
  const domain = process.env.AUTH0_ISSUER_BASE_URL;
  const clientId = process.env.AUTH0_AI_CLIENT_ID!;
  const clientSecret = process.env.AUTH0_AI_CLIENT_SECRET!;

  const bindingMessage = `Onboard is requesting production access for ${params.newHireName}. Access: ${params.accessLevel}. Job: ${params.jobId.slice(0, 8)}`;

  const response = await fetch(`${domain}/bc-authorize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      login_hint: params.userId,
      scope: 'openid',
      binding_message: bindingMessage,
      request_context: JSON.stringify({
        action: 'grant_production_access',
        newHireName: params.newHireName,
        accessLevel: params.accessLevel,
        jobId: params.jobId,
      }),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`CIBA bc-authorize failed: ${err}`);
  }

  const data = await response.json();
  return {
    requestId: data.auth_req_id,
    expiresIn: data.expires_in ?? 300,
  };
}

export async function pollCIBAResult(requestId: string): Promise<{
  approved: boolean;
  pending: boolean;
}> {
  const domain = process.env.AUTH0_ISSUER_BASE_URL;
  const clientId = process.env.AUTH0_AI_CLIENT_ID!;
  const clientSecret = process.env.AUTH0_AI_CLIENT_SECRET!;

  const response = await fetch(`${domain}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:openid:params:grant-type:ciba',
      auth_req_id: requestId,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (response.status === 200) {
    return { approved: true, pending: false };
  }

  if (response.status === 400) {
    const data = await response.json();
    if (data.error === 'authorization_pending') return { approved: false, pending: true };
    if (data.error === 'access_denied') return { approved: false, pending: false };
  }

  return { approved: false, pending: false };
}
