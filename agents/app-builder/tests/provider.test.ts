import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAgents } from '../src/agents.js';

describe('Google provider integration', () => {
  let temporary: string | undefined;

  afterEach(async () => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    if (temporary) await rm(temporary, { recursive: true, force: true });
    temporary = undefined;
  });

  it('runs real SDK tool calls and parses the reviewer decision without a network request', async () => {
    temporary = await mkdtemp(path.join(os.tmpdir(), 'app-builder-provider-test-'));
    await writeFile(path.join(temporary, 'package.json'), '{}');
    vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', 'test-key');
    const requests: string[] = [];
    const responses = [
      { functionCall: { name: 'read_file', args: { root: 'app', path: 'package.json' } } },
      { text: JSON.stringify({ approved: true, findings: [] }) },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        requests.push(String(init.body));
        const part = responses.shift();
        if (!part) throw new Error('Unexpected provider request');
        return new Response(
          JSON.stringify({
            candidates: [{ content: { role: 'model', parts: [part] }, finishReason: 'STOP' }],
            usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }),
    );
    const reviewer = createAgents({
      appRoot: temporary,
      uiRoot: temporary,
      configsRoot: null,
      model: 'gemini-2.5-flash',
      images: [
        {
          path: 'mobile.png',
          mediaType: 'image/png',
          data: Buffer.from('89504e470d0a1a0a', 'hex'),
        },
        {
          path: 'desktop.png',
          mediaType: 'image/png',
          data: Buffer.from('89504e470d0a1a0a', 'hex'),
        },
      ],
      manifest: {
        appName: 'example',
        brief: 'A site',
        designNotes: 'See designs',
        assets: [],
        pages: [
          {
            name: 'Home',
            route: '/',
            mobile: 'mobile.png',
            desktop: 'desktop.png',
            middleware: [],
            title: 'Home',
            description: 'Home page',
          },
        ],
      },
    });

    await expect(reviewer.review('design-system')).resolves.toEqual({
      approved: true,
      findings: [],
    });
    expect(requests).toHaveLength(2);
    expect(requests[0]).toContain('read_file');
    expect(requests[0]).toContain('inlineData');
    expect(requests[0]).not.toContain('write_file');
    expect(requests[1]).toContain('functionResponse');
  });
});
