---
name: git-workflow
description: Atomic-commit and clean-history conventions for this project
applies_when:
  always: true
---

# Git workflow

- One logical change per commit. If the message contains "and", split into two commits.
- Subject line: imperative mood, ≤72 characters, no trailing period.
- Body: the _why_, not the _what_. The diff already shows what changed.
- Don't amend or force-push commits that have been reviewed or merged.
- Rebase feature branches onto main before merging when the project uses linear history.
- Never commit `.env`, secrets, or large binaries.
