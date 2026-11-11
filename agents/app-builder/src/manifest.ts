import { z } from 'zod';

const nonEmpty = z.string().trim().min(1);
const imagePath = nonEmpty.refine(
  (value) => /\.(png|jpe?g|webp)$/i.test(value),
  'Design exports must be PNG, JPEG, or WebP images.',
);
const assetPath = nonEmpty.refine(
  (value) => /\.(png|jpe?g|webp|woff2?|ttf|otf)$/i.test(value),
  'Assets must be PNG, JPEG, WebP, WOFF, WOFF2, TTF, or OTF files.',
);

export const manifestSchema = z
  .strictObject({
    appName: z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/),
    brief: nonEmpty,
    designNotes: nonEmpty,
    assets: z.array(assetPath).default([]),
    pages: z
      .array(
        z.strictObject({
          name: nonEmpty,
          route: z.string().regex(/^\/(?:[a-zA-Z0-9_~.:[\]-]+\/?)*$/),
          mobile: imagePath,
          desktop: imagePath,
          middleware: z.array(nonEmpty),
          title: nonEmpty,
          description: nonEmpty,
        }),
      )
      .min(1),
  })
  .superRefine((manifest, context) => {
    const routes = new Set<string>();
    for (const [index, page] of manifest.pages.entries()) {
      const normalized = page.route === '/' ? '/' : page.route.replace(/\/$/, '');
      if (routes.has(normalized)) {
        context.addIssue({
          code: 'custom',
          path: ['pages', index, 'route'],
          message: `Duplicate route: ${page.route}`,
        });
      }
      routes.add(normalized);
    }
  });

export type Manifest = z.infer<typeof manifestSchema>;
