import { lstat, mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';

const blockedNames = new Set([
  'node_modules',
  '.git',
  '.nuxt',
  '.output',
  '.yarn',
  '.app-builder-run.json',
  '.npmrc',
]);
const maxFileSize = 100_000;

function segments(relativePath: string): string[] {
  if (!relativePath || path.isAbsolute(relativePath) || relativePath.includes('\0')) {
    throw new Error('A non-empty relative path is required.');
  }
  const parts = relativePath.split(/[\\/]/);
  if (
    parts.some(
      (part) =>
        !part ||
        part === '.' ||
        part === '..' ||
        part.includes(':') ||
        /[. ]$/.test(part) ||
        /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part) ||
        blockedNames.has(part.toLowerCase()) ||
        /^\.env(?:\.|$)/i.test(part),
    )
  ) {
    throw new Error(`Path is not allowed: ${relativePath}`);
  }
  return parts;
}

async function safePath(root: string, relativePath: string): Promise<string> {
  const parts = segments(relativePath);
  let current = root;
  for (const part of parts) {
    current = path.join(current, part);
    try {
      if ((await lstat(current)).isSymbolicLink()) {
        throw new Error(`Symbolic links are not allowed: ${relativePath}`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
  return current;
}

export async function makeAppRoot(
  appsRoot: string,
  appName: string,
  resume: boolean,
): Promise<string> {
  const realAppsRoot = await realpath(appsRoot);
  const target = await safePath(realAppsRoot, appName);
  if (resume) {
    if (!(await lstat(target)).isDirectory()) throw new Error('The app path is not a directory.');
  } else {
    await mkdir(target);
  }
  return target;
}

export async function readText(root: string, relativePath: string): Promise<string> {
  const file = await safePath(root, relativePath);
  const stat = await lstat(file);
  if (!stat.isFile() || stat.size > maxFileSize) {
    throw new Error(`Not a regular text file under ${maxFileSize} bytes: ${relativePath}`);
  }
  const data = await readFile(file);
  if (data.includes(0)) {
    throw new Error(`Binary files cannot be read as text: ${relativePath}`);
  }
  return data.toString('utf8');
}

export async function listFiles(root: string, relativePath?: string): Promise<string[]> {
  const dir = relativePath ? await safePath(root, relativePath) : root;
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter(
      (entry) =>
        !entry.isSymbolicLink() &&
        !blockedNames.has(entry.name.toLowerCase()) &&
        !/^\.env(?:\.|$)/i.test(entry.name),
    )
    .map((entry) => `${entry.name}${entry.isDirectory() ? '/' : ''}`)
    .sort();
}

export async function writeText(
  root: string,
  relativePath: string,
  content: string,
): Promise<void> {
  if (Buffer.byteLength(content) > maxFileSize || content.includes('\0')) {
    throw new Error(`Text file exceeds the allowed size or contains binary data: ${relativePath}`);
  }
  const file = await safePath(root, relativePath);
  await mkdir(path.dirname(file), { recursive: true });
  await safePath(root, relativePath);
  await writeFile(file, content, 'utf8');
}

export async function loadDesignImage(
  designRoot: string,
  relativePath: string,
): Promise<{ data: Buffer; mediaType: string }> {
  const file = await safePath(designRoot, relativePath);
  const stat = await lstat(file);
  if (!stat.isFile() || stat.size > 5_000_000) {
    throw new Error(`Design export must be a regular file under 5 MB: ${relativePath}`);
  }
  const data = await readFile(file);
  const png = data.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
  const jpeg = data.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'));
  const webp =
    data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP';
  const ext = path.extname(relativePath).toLowerCase();
  if (png && ext === '.png') return { data, mediaType: 'image/png' };
  if (jpeg && (ext === '.jpg' || ext === '.jpeg')) return { data, mediaType: 'image/jpeg' };
  if (webp && ext === '.webp') return { data, mediaType: 'image/webp' };
  throw new Error(`Design export contents do not match its image extension: ${relativePath}`);
}

export async function loadDesignAsset(
  designRoot: string,
  relativePath: string,
): Promise<{ data: Buffer; mediaType: string }> {
  const ext = path.extname(relativePath).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
    return loadDesignImage(designRoot, relativePath);
  }
  const file = await safePath(designRoot, relativePath);
  const stat = await lstat(file);
  if (!stat.isFile() || stat.size > 5_000_000) {
    throw new Error(`Asset must be a regular file under 5 MB: ${relativePath}`);
  }
  const data = await readFile(file);
  const header = data.subarray(0, 4);
  const formats: Record<string, { signature: Buffer; mediaType: string }> = {
    '.woff': { signature: Buffer.from('wOFF'), mediaType: 'font/woff' },
    '.woff2': { signature: Buffer.from('wOF2'), mediaType: 'font/woff2' },
    '.ttf': { signature: Buffer.from('00010000', 'hex'), mediaType: 'font/ttf' },
    '.otf': { signature: Buffer.from('OTTO'), mediaType: 'font/otf' },
  };
  const format = formats[ext];
  if (!format || !header.equals(format.signature)) {
    throw new Error(`Asset contents do not match its font extension: ${relativePath}`);
  }
  return { data, mediaType: format.mediaType };
}

export async function copyDesignImage(
  root: string,
  relativePath: string,
  data: Buffer,
): Promise<void> {
  const parts = segments(relativePath);
  if (parts[0] !== 'public' || parts.length < 2) {
    throw new Error('Copied assets must be inside the app public directory.');
  }
  const file = await safePath(root, relativePath);
  await mkdir(path.dirname(file), { recursive: true });
  await safePath(root, relativePath);
  await writeFile(file, data);
}
