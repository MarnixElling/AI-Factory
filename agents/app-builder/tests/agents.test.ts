import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ generateText: vi.fn() }));

vi.mock('@ai-sdk/google', () => ({ google: (model: string) => model }));
vi.mock('ai', () => ({
  generateText: mocks.generateText,
  tool: (definition: unknown) => definition,
  stepCountIs: (count: number) => count,
  Output: { object: (config: unknown) => config },
}));

import { createAgents } from '../src/agents.js';

type MockTool = {
  execute: (input: { root: 'app'; path: string }) => Promise<unknown>;
};

type GenerateOptions = { tools: Record<string, MockTool> };

describe('agent capabilities', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'app-builder-agent-test-'));
    await writeFile(path.join(root, 'package.json'), '{}');
    mocks.generateText.mockReset();
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  function agents() {
    return createAgents({
      appRoot: root,
      uiRoot: root,
      configsRoot: null,
      model: 'test-model',
      images: [],
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
  }

  it('gives the executor write tools and the reviewer read-only tools', async () => {
    mocks.generateText.mockImplementationOnce(async ({ tools }: GenerateOptions) => {
      expect(Object.keys(tools)).toContain('write_file');
      expect(Object.keys(tools)).toContain('copy_asset');
      return { finishReason: 'stop', output: { status: 'completed', summary: 'Done' } };
    });
    mocks.generateText.mockImplementationOnce(async ({ tools }: GenerateOptions) => {
      expect(Object.keys(tools)).toEqual(['list_files', 'read_file']);
      await tools.read_file.execute({ root: 'app', path: 'package.json' });
      return { finishReason: 'stop', output: { approved: true, findings: [] } };
    });
    await agents().execute('base-app', []);
    await expect(agents().review('base-app')).resolves.toEqual({ approved: true, findings: [] });
  });

  it('rejects a reviewer approval without inspecting an app file', async () => {
    mocks.generateText.mockResolvedValue({
      finishReason: 'stop',
      output: { approved: true, findings: [] },
    });
    await expect(agents().review('base-app')).rejects.toThrow('did not inspect any app files');
  });

  it('surfaces blocked and unfinished executor responses', async () => {
    mocks.generateText.mockResolvedValueOnce({
      finishReason: 'stop',
      output: { status: 'blocked', summary: 'Missing component' },
    });
    await expect(agents().execute('design-system', [])).rejects.toThrow('Missing component');
    mocks.generateText.mockResolvedValueOnce({ finishReason: 'tool-calls' });
    await expect(agents().execute('base-app', [])).rejects.toThrow('did not finish');
  });
});
