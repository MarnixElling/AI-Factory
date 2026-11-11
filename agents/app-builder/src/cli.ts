import { createHash } from 'node:crypto';
import { lstat, readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { createAgents, type DesignImage } from './agents.js';
import { loadDesignAsset, loadDesignImage, makeAppRoot } from './files.js';
import { manifestSchema } from './manifest.js';
import { runWorkflow } from './workflow.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

async function optionalDirectory(directory: string): Promise<string | null> {
  try {
    const info = await lstat(directory);
    if (info.isSymbolicLink() || !info.isDirectory()) {
      throw new Error(`Expected a directory, not a link or file: ${directory}`);
    }
    return await realpath(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const resume = args.includes('--resume');
  const positional = args.filter((arg) => arg !== '--resume');
  if (positional.length !== 1 || args.length !== positional.length + Number(resume)) {
    throw new Error('Usage: yarn build-app <manifest.json> [--resume]');
  }
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('Set GOOGLE_GENERATIVE_AI_API_KEY before running the builder.');
  }

  const manifestPath = await realpath(path.resolve(positional[0]));
  const manifest = manifestSchema.parse(JSON.parse(await readFile(manifestPath, 'utf8')));
  const designRoot = path.dirname(manifestPath);
  const imagePaths = [
    ...new Set([
      ...manifest.assets,
      ...manifest.pages.flatMap((page) => [page.mobile, page.desktop]),
    ]),
  ];
  const framePaths = new Set(manifest.pages.flatMap((page) => [page.mobile, page.desktop]));
  const images: DesignImage[] = [];
  let totalSize = 0;
  for (const imagePath of imagePaths) {
    const image = framePaths.has(imagePath)
      ? await loadDesignImage(designRoot, imagePath)
      : await loadDesignAsset(designRoot, imagePath);
    totalSize += image.data.length;
    if (totalSize > 15_000_000)
      throw new Error('Design exports and assets must total at most 15 MB.');
    images.push({ path: imagePath, ...image });
  }

  const uiRoot = await optionalDirectory(path.join(repoRoot, 'layers', 'ui-base'));
  if (!uiRoot) throw new Error('The layers/ui-base layer is required.');
  const configsRoot = await optionalDirectory(path.join(repoRoot, 'layers', 'configs'));
  if (!configsRoot)
    console.warn('Warning: layers/configs is missing; generated config will not extend it.');

  const hash = createHash('sha256').update(JSON.stringify(manifest));
  for (const image of images) hash.update(image.path).update(image.data);
  const runHash = hash.digest('hex');
  const appRoot = await makeAppRoot(path.join(repoRoot, 'apps'), manifest.appName, resume);
  const marker = path.join(appRoot, '.app-builder-run.json');
  if (resume) {
    const markerInfo = await lstat(marker);
    if (markerInfo.isSymbolicLink() || !markerInfo.isFile()) {
      throw new Error('Invalid app-builder run marker.');
    }
    const saved = zRunMarker.parse(JSON.parse(await readFile(marker, 'utf8')));
    if (saved.hash !== runHash) {
      throw new Error(
        'Manifest or design files changed since the app was created; refusing to resume.',
      );
    }
  } else {
    await writeFile(marker, JSON.stringify({ hash: runHash }, null, 2), { flag: 'wx' });
  }

  const agents = createAgents({
    appRoot,
    uiRoot,
    configsRoot,
    manifest,
    images,
    model: process.env.APP_BUILDER_MODEL || 'gemini-2.5-flash',
  });
  await runWorkflow({
    ...agents,
    onProgress: (message) => console.log(message),
  });
  console.log(
    'All phases were approved. Install dependencies and run the generated app checks before use.',
  );
  console.log('SPA metadata is client-rendered; validate crawler support and hosting separately.');
}

const zRunMarker = z.object({ hash: z.string().regex(/^[a-f0-9]{64}$/) });

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
