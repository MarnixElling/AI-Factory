import { describe, expect, it, vi } from 'vitest';
import { runWorkflow, type Phase } from '../src/workflow.js';

describe('runWorkflow', () => {
  it('revises rejected work before moving to the next phase', async () => {
    const calls: string[] = [];
    let baseReviews = 0;
    await runWorkflow({
      execute: async (phase, findings) => {
        calls.push(`execute:${phase}:${findings.join(',')}`);
      },
      review: async (phase) => {
        calls.push(`review:${phase}`);
        if (phase === 'base-app' && baseReviews++ === 0) {
          return { approved: false, findings: ['Add error page'] };
        }
        return { approved: true, findings: [] };
      },
      onProgress: () => {},
    });
    expect(calls).toEqual([
      'execute:base-app:',
      'review:base-app',
      'execute:base-app:Add error page',
      'review:base-app',
      'execute:design-system:',
      'review:design-system',
      'execute:pages:',
      'review:pages',
    ]);
  });

  it('stops at the attempt limit without executing later phases', async () => {
    const executed: Phase[] = [];
    await expect(
      runWorkflow(
        {
          execute: async (phase) => {
            executed.push(phase);
          },
          review: async () => ({ approved: false, findings: ['Fix the app'] }),
          onProgress: () => {},
        },
        2,
      ),
    ).rejects.toThrow('review attempt limit reached');
    expect(executed).toEqual(['base-app', 'base-app']);
  });

  it('treats approval with findings as a request for changes', async () => {
    const execute = vi.fn(async () => {});
    const review = vi
      .fn()
      .mockResolvedValueOnce({ approved: true, findings: ['Fix the issue'] })
      .mockResolvedValue({ approved: true, findings: [] });
    await runWorkflow({ execute, review, onProgress: () => {} });
    expect(execute).toHaveBeenNthCalledWith(2, 'base-app', ['Fix the issue']);
  });

  it('fails explicitly when rejection has no findings', async () => {
    const execute = vi.fn(async () => {});
    await expect(
      runWorkflow({
        execute,
        review: async () => ({ approved: false, findings: [] }),
        onProgress: () => {},
      }),
    ).rejects.toThrow('without actionable findings');
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('does not continue when an executor fails', async () => {
    const review = vi.fn();
    await expect(
      runWorkflow({
        execute: async () => {
          throw new Error('missing component');
        },
        review,
        onProgress: () => {},
      }),
    ).rejects.toThrow('missing component');
    expect(review).not.toHaveBeenCalled();
  });
});
