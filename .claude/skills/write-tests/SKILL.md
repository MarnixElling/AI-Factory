---
name: write-tests
description: Write vitest and @vue/test-utils tests for a page or component and make them pass. Use after building.
---

# Write tests

Input: the app name and the page or component name.

1. Put tests in the `tests/` folder of the app or layer, mirroring the source path. Never put tests next to source files.
2. Use `mount` from `@vue/test-utils` and `describe`, `it`, `expect`, `vi` from `vitest`.
3. Cover, in this order:
   - Rendering of the main content from the brief.
   - Every interaction listed for the page: trigger the event, assert the result.
   - The states listed in the brief: empty, error, loading.
   - Responsive class presence only where the brief defines a rule.
4. Run `yarn test`. If a test fails, decide whether the test or the code is wrong and fix that. Never delete or weaken a test to pass.
5. Commit with `test: <page> specs`.
