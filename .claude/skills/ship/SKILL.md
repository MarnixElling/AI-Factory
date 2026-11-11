---
name: ship
description: Verify the branch, push it and open a pull request so Vercel creates a preview. Use when a page is built and tested.
---

# Ship

1. Confirm the current branch is not `main`.
2. Run `yarn check`. If anything fails, fix the cause and run it again.
3. Push the branch with `git push -u origin <branch>`. Never force push.
4. Open a pull request with `gh pr create` if the GitHub CLI is available. The description lists: what was built, assumptions from `brief.md`, any component added to `layers/core`, and anything the human should check in the preview.
5. Report the branch name and the pull request link. Tell the human to open the Vercel preview from the pull request.
6. Never merge. Merging to `main` is the human's decision and is the deploy.
