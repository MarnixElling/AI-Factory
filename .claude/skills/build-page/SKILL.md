---
name: build-page
description: Build one page of an app from its brief. Use after the brief has been reviewed.
---

# Build page

Input: the app name and the page name. Work only inside `apps/<app>`, except when adding a generic component to `layers/core`.

1. Read `apps/<app>/brief.md`, `designs/notes.md` and the page's frames. Stop and ask if the brief is missing or the page is not in it.
2. Create or switch to branch `page/<page>`.
3. Reuse components from `layers/core/components` first. If a component is generic and missing, add it to the layer with a test and mention it in the commit message. If it is specific to this project, keep it in `apps/<app>/components`.
4. Create `apps/<app>/pages/<page>.vue` using `<script setup lang="ts">` and Tailwind token classes only.
5. Declare the page's interactions in `apps/<app>/interactions/<page>.ts` as an `InteractionMap` and wire them through `useInteractions`. Keep logic out of templates.
6. Follow the breakpoint rules in the brief. Mobile first, then larger sizes.
7. Run `yarn lint` and `yarn typecheck`. Fix the causes, never silence them.
8. Commit with `build: <page> page`. Then continue with the write-tests skill.
