# AI Factory

A monorepo for building SPA prototypes and websites. One shared Nuxt layer, one Nuxt app per project.

## Structure

- `layers/core`: shared Nuxt layer (Tailwind setup, tokens, base components, the interactions runtime).
- `apps/<name>`: one Nuxt app per project. It extends the core layer and holds only project-specific pages, components and interactions.
- `.claude/skills`: the factory stages (ingest-design, build-page, write-tests, ship).
- The layer never imports from an app. Apps only extend the layer.
- Reusable across projects goes in `layers/core`. Needed by one project only stays in that app.

## Stack

Nuxt 3 as an SPA (`ssr: false`), Vue composition API with `<script setup lang="ts">`, Tailwind, yarn, vitest with @vue/test-utils.

## Code rules

- No comments in code. Names and structure carry the meaning. Lint enforces this.
- Always end statements with semicolons.
- Use yarn, never npm.
- Style with Tailwind classes backed by tokens in `tailwind.config.ts`. No hex colors or arbitrary values in templates.
- Interactions are declared in `apps/<name>/interactions/<page>.ts` and consumed through `useInteractions`. No business logic inline in templates.
- Do not add dependencies without saying why.

## Tests

- Every page and every component gets a test in the `tests/` folder of its app or layer, never next to the source file.
- Tests use vitest and @vue/test-utils.
- Cover rendering, interactions and states from the brief.

## Git

- Never commit or push to `main`. Work on `page/<name>`, `feat/<name>` or `fix/<name>`.
- Commit at the end of each stage with a prefix: `design:`, `build:`, `test:`, `fix:`, `chore:`.
- Never force-push or rewrite history. Commits made by the human are authoritative: pull before continuing.
- `yarn check` (lint, typecheck, test) must pass before every commit.

## Working agreement

- When something is ambiguous, ask, or write the assumption into `brief.md`. Do not guess silently.
- Stay inside the folder the task names.
- Fix root causes. Never weaken lint, types or tests to get green.
- Stop at review points and wait for the human.
