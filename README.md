# Screenshots for issues and pull requests

This orphan branch holds the images that issue and pull request posts link to, because `gh` cannot upload attachments. It is never merged, deleted, rebased or force-pushed.

- One directory per GitHub number: `259/add-event-before.png`. Issues and PRs share one number sequence, so numbers never collide. Images taken for a PR go under the issue it delivers, when there is one.
- Posts link the raw file pinned to the commit that added it, `https://raw.githubusercontent.com/mgasca/calendar/<commit>/<number>/<file>.png`, so the link stays valid whatever is added later.
- Add images with git plumbing, without checking the branch out: see "Screenshots on GitHub" in `.claude/skills/issue-handover/SKILL.md` on `main`.
