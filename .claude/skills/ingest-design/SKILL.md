---
name: ingest-design
description: Turn the files in apps/<app>/designs into a design brief and Tailwind tokens. Use before building any page from a design.
---

# Ingest design

Input: the app name. Work only inside `apps/<app>`.

1. Read everything in `apps/<app>/designs`: PNG or SVG frames, `tokens.json`, `notes.md`.
2. Pair frames by name (`home.mobile.png`, `home.desktop.png`). A page with only one size is allowed.
3. If `tokens.json` exists, write its values into `apps/<app>/tailwind.config.ts` under `theme.extend`, following the shape in `layers/core/tailwind.config.ts`. Do not duplicate tokens that are unchanged from the core layer.
4. Write `apps/<app>/brief.md` with these sections:
   - Pages: name, purpose, route.
   - Per page, the sections it contains, in order.
   - Breakpoint behavior from `notes.md`. For any page drawn at one size only, state which size was inferred and the responsive rule applied.
   - Components needed. Mark each as `exists in core`, `new generic` (belongs in the layer) or `app specific`.
   - Interactions per page as a table: element id, event, result.
   - States to cover: hover, empty, error, loading.
   - Assumptions and open questions.
5. Commit on branch `design/<app>` with the message `design: ingest <app> brief`.
6. Stop. Ask the human to review `brief.md` and the tokens. Do not start building.
