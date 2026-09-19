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

All work is done in branches. Convention: `<type>/<ISSUE-ID>-short-description`

| Prefix      | Use for                             |
| ----------- | ----------------------------------- |
| `feature/`  | New features                        |
| `fix/`      | Bug fixes                           |
| `refactor/` | Code refactoring                    |
| `docs/`     | Documentation changes               |
| `chore/`    | Tooling, config, dependency updates |

Examples:

- `feature/FIN-42-add-user-auth`
- `fix/FIN-17-correct-date-parsing`
- `chore/FIN-8-upgrade-dependencies`

## Workflow

0. **Check whether somebody is already on it.** Several sessions share this checkout —
   `git branch -vv --no-merged main` and `gh pr list`. A branch that already covers the task is the
   branch to continue on; starting a second one is how PRs #51 and #53 came to build the same fix.
   `scripts/parallel-work.mjs` prints this at session start, and `AGENTS.md` carries the rule.
1. Create a branch from `main` using the naming convention above
2. Commit changes with conventional commits (see `git-commit` skill)
3. Open a PR targeting `main` (see **Writing the PR** below)
4. Merge only when CI passes and the branch is ready to deploy
5. After a merge: `git fetch --prune`, fast-forward `main`, and delete the merged local branch with
   `git branch -d` — `-d` refuses an unmerged branch, which is the point. Never `git reset --hard`
   to tidy up: it discards another session's uncommitted work along with your own.

The ticket id in the branch name is what makes two branches on one ticket read as a collision
rather than as two unrelated names. Keep it.

## Writing the PR

**Assume the reader has not read the spec.** A title or an opening paragraph is often read by
someone deciding whether this PR is the one they are looking for, months later, from a list — and
they have none of the context the author has right now.

### The title

A short imperative summary of **what changes**, in the same style as a commit subject. The test:
would someone who has never opened the spec know what this PR is for?

- DO — `feat(inspection): save answers to the server, not only to the device`
- DON'T — `feat(inspection): the answers lane (C1, partial)`

The second one was a real title and had to be rewritten. Both of its distinctive words fail the
test: "answers lane" is a term coined inside one spec, and `C1` is a step number from a plan that
lives in the other repository. Neither means anything to a reader, and a reader is who a title is
for.

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
