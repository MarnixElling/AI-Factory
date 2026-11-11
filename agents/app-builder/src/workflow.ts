export const phases = ['base-app', 'design-system', 'pages'] as const;
export type Phase = (typeof phases)[number];

export interface Review {
  approved: boolean;
  findings: string[];
}

export interface WorkflowCallbacks {
  execute: (phase: Phase, findings: string[]) => Promise<void>;
  review: (phase: Phase) => Promise<Review>;
  onProgress: (message: string) => void;
}

export async function runWorkflow(callbacks: WorkflowCallbacks, maxAttempts = 3): Promise<void> {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error('The review attempt limit must be a positive integer.');
  }
  for (const phase of phases) {
    let findings: string[] = [];
    let approved = false;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      callbacks.onProgress(`${phase}: execution ${attempt}/${maxAttempts}`);
      await callbacks.execute(phase, findings);
      callbacks.onProgress(`${phase}: independent review ${attempt}/${maxAttempts}`);
      const review = await callbacks.review(phase);
      if (review.approved && review.findings.length === 0) {
        approved = true;
        callbacks.onProgress(`${phase}: approved`);
        break;
      }
      if (review.findings.length === 0) {
        throw new Error(`${phase}: reviewer rejected the phase without actionable findings.`);
      }
      findings = review.findings;
      callbacks.onProgress(`${phase}: changes requested: ${findings.join('; ')}`);
    }
    if (!approved) {
      throw new Error(
        `${phase}: review attempt limit reached. Last findings: ${findings.join('; ')}`,
      );
    }
  }
}
