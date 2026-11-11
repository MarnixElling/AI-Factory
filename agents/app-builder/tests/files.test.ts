import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  copyDesignImage,
  listFiles,
  loadDesignAsset,
  loadDesignImage,
  makeAppRoot,
  readText,
  writeText,
} from '../src/files.js';

describe('filesystem tools', () => {
  let temporary: string;
  let root: string;

  beforeEach(async () => {
    temporary = await mkdtemp(path.join(os.tmpdir(), 'app-builder-test-'));
    root = path.join(temporary, 'app');
    await mkdir(root);
  });

  afterEach(async () => {
    await rm(temporary, { recursive: true, force: true });
  });

  it('writes and reads app files and lists directories', async () => {
    await writeText(root, 'app/pages/index.vue', '<template>Home</template>');
    expect(await readText(root, 'app/pages/index.vue')).toBe('<template>Home</template>');
    expect(await listFiles(root, 'app')).toEqual(['pages/']);
  });

  it('rejects traversal, absolute paths, private files and builder state', async () => {
    for (const unsafe of [
      '../outside',
      'app/../../outside',
      '.. /outside',
      'NUL.txt',
      '.env',
      '.npmrc',
      '.app-builder-run.json',
      path.join(temporary, 'outside'),
    ]) {
      await expect(writeText(root, unsafe, 'bad')).rejects.toThrow();
    }
    await expect(readText(root, '../outside')).rejects.toThrow();
  });

  it('rejects links into other directories', async () => {
    const outside = path.join(temporary, 'outside');
    await mkdir(outside);
    await symlink(outside, path.join(root, 'linked'), 'junction');
    await expect(writeText(root, 'linked/file.txt', 'bad')).rejects.toThrow('Symbolic links');
    expect(await listFiles(root)).not.toContain('linked/');
  });

  it('does not overwrite an existing app unless explicitly resuming', async () => {
    await expect(makeAppRoot(temporary, 'app', false)).rejects.toThrow();
    expect(await makeAppRoot(temporary, 'app', true)).toBe(root);
  });

  it('only loads recognized images and copies them into public', async () => {
    const image = Buffer.from('89504e470d0a1a0a00000000', 'hex');
    await writeFile(path.join(temporary, 'image.png'), image);
    const loaded = await loadDesignImage(temporary, 'image.png');
    expect(loaded.mediaType).toBe('image/png');
    await copyDesignImage(root, 'public/image.png', loaded.data);
    expect(await readFile(path.join(root, 'public', 'image.png'))).toEqual(image);
    await expect(copyDesignImage(root, 'app/image.png', image)).rejects.toThrow('public');
    await writeFile(path.join(temporary, 'bad.png'), 'not an image');
    await expect(loadDesignImage(temporary, 'bad.png')).rejects.toThrow('do not match');
  });

  it('loads explicitly supplied font assets and rejects mismatched content', async () => {
    await writeFile(path.join(temporary, 'font.woff2'), Buffer.from('wOF2font'));
    expect((await loadDesignAsset(temporary, 'font.woff2')).mediaType).toBe('font/woff2');
    await writeFile(path.join(temporary, 'bad.woff2'), Buffer.from('wOFFfont'));
    await expect(loadDesignAsset(temporary, 'bad.woff2')).rejects.toThrow('font extension');
  });
});
