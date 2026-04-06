import { AgentState } from '../types';
import { requestProductionAccessApproval, pollCIBAResult } from '../auth0/ciba';
import { updateJobStep, updateJobStatus, updateJobCIBARequest } from '../store/jobs';

/**
 * THE CENTREPIECE OF THE HACKATHON DEMO.
 *
 * This agent intentionally has NO credentials of its own.
 * It cannot act autonomously. It PAUSES execution and sends a CIBA
 * push notification to the manager's Auth0 Guardian app.
 * Only after explicit human approval does onboarding continue.
 *
 * This is agent humility encoded into the authorization layer.
 */
export async function runProductionAgent(state: AgentState): Promise<Partial<AgentState>> {
  const { jobId, newHire, userId } = state;

  try {
    // Signal the UI: we're waiting for human approval
    await updateJobStep(jobId, 'production', 'awaiting_approval');
    await updateJobStatus(jobId, 'awaiting_ciba');

    // Initiate CIBA — sends push notification to manager's Auth0 Guardian app
    const { requestId, expiresIn } = await requestProductionAccessApproval({
      userId,
      newHireName: `${newHire.firstName} ${newHire.lastName}`,
      accessLevel: 'Production Read Access (AWS, Datadog)',
      jobId,
    });

    await updateJobCIBARequest(jobId, requestId);

    // Poll for up to 5 minutes (60 × 5s intervals)
    const maxAttempts = Math.min(Math.floor(expiresIn / 5), 60);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const { approved, pending } = await pollCIBAResult(requestId);

      if (approved) {
        // Manager approved — grant access
        // In production: call AWS IAM, Datadog API, etc.
        await updateJobStep(
          jobId,
          'production',
          'completed',
          'Production access granted after explicit manager approval'
        );
        await updateJobStatus(jobId, 'completed');

        return {
          steps: state.steps.map((s) =>
            s.platform === 'production' ? { ...s, status: 'completed' } : s
          ),
          auditLog: [
            ...state.auditLog,
            {
              timestamp: new Date(),
              action: 'Production access APPROVED and granted',
              platform: 'production',
              details: `Manager approved production access for ${newHire.firstName} ${newHire.lastName}. Access granted: AWS Production Read, Datadog.`,
              tokenScope: 'none — CIBA approval required, no automated token issued',
              approved: true,
            },
          ],
        };
      }

      if (!pending) {
        // Manager denied
        await updateJobStep(
          jobId,
          'production',
          'failed',
          undefined,
          'Manager denied production access request'
        );

        return {
          auditLog: [
            ...state.auditLog,
            {
              timestamp: new Date(),
              action: 'Production access DENIED by manager',
              platform: 'production',
              details: `Manager explicitly denied production access for ${newHire.firstName} ${newHire.lastName}.`,
              approved: false,
            },
          ],
        };
      }
    }

    // Timeout — CIBA expired without response
    await updateJobStep(
      jobId,
      'production',
      'failed',
      undefined,
      'CIBA approval request expired without response'
    );

    return {
      error: 'Production access approval timed out',
      auditLog: [
        ...state.auditLog,
        {
          timestamp: new Date(),
          action: 'Production access request TIMED OUT',
          platform: 'production',
          details: `CIBA request expired. Manager did not respond within the approval window.`,
          approved: false,
        },
      ],
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    await updateJobStep(jobId, 'production', 'failed', undefined, message);
    return { error: `Production agent failed: ${message}` };
  }
}
