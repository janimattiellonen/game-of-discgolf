---
name: git-workflow
description: Git branching conventions and workflow rules for this project
user-invocable: false
---

# Git Workflow

## Main Branch

`main` must always be in a deployable state:

- No broken builds
- No WIP features (use feature flags if a feature must be merged unfinished)

## Branch Naming

All work is done in branches. Convention: `<type>/short-description`.

| Prefix      | Use for                             |
| ----------- | ----------------------------------- |
| `feature/`  | New features                        |
| `fix/`      | Bug fixes                           |
| `refactor/` | Code refactoring                    |
| `docs/`     | Documentation changes               |
| `chore/`    | Tooling, config, dependency updates |

Examples — all three are branches this repo has actually had:

- `feature/disc-types`
- `chore/add-vitest-and-game-unit-tests`
- `docs/fix-git-workflow-skill-for-this-repo`

**This repo has no issue tracker**, so the plain form above is the whole rule. If one is
ever wired up, prefer `<type>/<ISSUE-ID>-short-description`: an id is what makes two
branches on one ticket read as a collision rather than as two unrelated names.

## Workflow

0. **Check whether somebody is already on it.** Several sessions can share this checkout —
   `git branch -vv --no-merged main` and `gh pr list`. A branch that already covers the task is the
   branch to continue on; starting a second one is how two PRs end up building the same fix.
1. Create a branch from `main` using the naming convention above
2. Commit changes with conventional commits (see `git-commit` skill)
3. Open a PR targeting `main` (see **Writing the PR** below)
4. Merge only when the whole **Before you say it is done** checklist in `CLAUDE.md` passes:
   `pnpm check` green, `pnpm build` too if you touched `vite.config.ts`, and the game actually
   run. There is no CI in this repo, so every one of those is yours to run — nothing will catch
   a red branch for you.
5. After a merge: `git fetch --prune`, fast-forward `main`, and delete the merged local branch with
   `git branch -d` — `-d` refuses an unmerged branch, which is the point. Never `git reset --hard`
   to tidy up: it discards another session's uncommitted work along with your own.

## Writing the PR

**Assume the reader has not read the spec.** A title or an opening paragraph is often read by
someone deciding whether this PR is the one they are looking for, months later, from a list — and
they have none of the context the author has right now.

### The title

A short imperative summary of **what changes**, in the same style as a commit subject. The test:
would someone who has never opened the spec know what this PR is for?

- DO — `feat(course): show hole length in metres on the tee sign`
- DON'T — `feat(course): the metre seam (C1, partial)`

The second one is invented, but its shape is the one that keeps having to be rewritten. Both of
its distinctive words fail the test: "metre seam" is a term coined inside one spec, and `C1` is a
step number from a plan the reader has never seen. Neither means anything to a reader, and a
reader is who a title is for.

So: **no internal vocabulary, and no task or step codes.** If a concept genuinely has no plain
name, the title should describe its effect instead of naming it.

### The description

Lead with the substance, in this order:

1. **What is true today**, and why it is a problem — one or two sentences, concrete.
2. **What this changes.**
3. **Then** the process notes: draft status, what is missing, what is out of scope.

Starting with status ("Draft — three of five steps are in") puts the least durable information
first and makes a reader work to find out what the PR is even about.

**Define spec vocabulary at first use**, in the PR itself, one sentence. A link to the spec is not
enough: the reviewer is in a diff, and a term they have to go and look up is a term they will
guess at instead.

**Name decisions that a reviewer could not infer from the diff** — the ones where the code looks
arbitrary until you know what it is avoiding. Those are the paragraphs worth writing; a summary of
what the diff already shows is not.
