import { describe, expect, it } from 'vitest';
import { manifestSchema } from '../src/manifest.js';

const page = {
  name: 'Home',
  route: '/',
  mobile: 'home-mobile.png',
  desktop: 'home-desktop.png',
  middleware: [],
  title: 'Home',
  description: 'Home page',
};

const manifest = {
  appName: 'example-site',
  brief: 'A website',
  designNotes: 'Use the exported designs.',
  pages: [page],
};

describe('manifestSchema', () => {
  it('accepts explicit design mappings and defaults optional assets', () => {
    expect(manifestSchema.parse(manifest).assets).toEqual([]);
    expect(manifestSchema.parse({ ...manifest, assets: ['font.woff2'] }).assets).toEqual([
      'font.woff2',
    ]);
  });

  it('rejects invalid app names, missing mappings, and unsupported images', () => {
    expect(manifestSchema.safeParse({ ...manifest, appName: '../other' }).success).toBe(false);
    expect(
      manifestSchema.safeParse({ ...manifest, pages: [{ ...page, desktop: '' }] }).success,
    ).toBe(false);
    expect(
      manifestSchema.safeParse({ ...manifest, pages: [{ ...page, mobile: 'design.svg' }] }).success,
    ).toBe(false);
  });

  it('rejects duplicate routes even with trailing slashes', () => {
    const pages = [
      { ...page, route: '/about' },
      { ...page, route: '/about/' },
    ];
    expect(manifestSchema.safeParse({ ...manifest, pages }).success).toBe(false);
  });

  it('requires explicit middleware and metadata', () => {
    const { middleware: ignored, ...withoutMiddleware } = page;
    expect(ignored).toEqual([]);
    expect(manifestSchema.safeParse({ ...manifest, pages: [withoutMiddleware] }).success).toBe(
      false,
    );
    expect(manifestSchema.safeParse({ ...manifest, pages: [{ ...page, title: '' }] }).success).toBe(
      false,
    );
  });

  it('rejects unknown fields instead of silently ignoring input mistakes', () => {
    expect(manifestSchema.safeParse({ ...manifest, asset: ['logo.png'] }).success).toBe(false);
    expect(
      manifestSchema.safeParse({ ...manifest, pages: [{ ...page, midleware: [] }] }).success,
    ).toBe(false);
  });
});
