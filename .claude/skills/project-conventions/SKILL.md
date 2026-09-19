---
name: project-conventions
description: Project architecture and code conventions — route structure, feature organization, database query naming, and file organization. Note that feature work also requires a spec in specs/; see the separate specs skill.
user-invocable: false
---

# Project conventions

## Specs come first

Every major feature has a specification in `specs/`. Write or update the spec
**before** implementing a feature or changing behaviour, and verify it against
the code once lint, typecheck and tests are green.

The full workflow and the writing rules live in the `specs` skill — read it
before touching anything in `specs/`.

## Every pull request updates the changelog

`CHANGELOG.md` is part of the deliverable, not an afterthought: before a branch is
opened as a pull request, its user-visible changes get a line under
`## [Unreleased]`, committed on the branch so the entry is reviewed with the code.
Nothing writes the changelog after a merge.

The entry style, what earns a line, and the month roll-up ritual live in the
`changelog` skill — read it before editing `CHANGELOG.md`.

## Names are English, Finnish is for the user

Every identifier is English: route paths and route files, components, functions,
types, variables, columns. Finnish belongs only in what a person reads — page
copy, labels, button text, validation messages, the `AdminMenu` entries.

`AdminMenu` is the pattern to copy: the label is `Noutolista`, the path is
`/retrieval`.

Two route paths were Finnish and were renamed: `/vastaukset` → `/responses`, and
`/kiekko/:token` → `/disc/:token`. Renaming an admin route is free, because an
admin follows a menu link. **A public URL is not free.** The owner link had
already been sent inside text messages that cannot be recalled, so
`routes/kiekko.$token.tsx` stays for ever as a `301` to the new path. Before
renaming any route, ask who is holding the old URL: if the answer is anyone
outside the admin's browser, the old path has to keep working.

## Slim routes

Route files in `app/routes/` are thin wiring layers only:

- **Loader:** fetch data via feature query functions, redirect if auth is missing
- **Action:** delegate to feature functions, return results
- **Component:** `return <FeaturePage {...loaderData} />`

No business logic in route files. If logic is needed, it belongs in `app/features/`.

## Business logic in features

- All business logic lives in `app/features/<domain>/`
- Feature components, types, and query functions are co-located per domain
- Route components are thin wrappers; feature components own all UI logic
- Features are vertical slices and should be as self-contained as possible — a feature should not reach into other features

A slice is what a user does end to end, not a single operation. `app/features/discs/`
holds `list/`, `deletion/`, `disposal/`, `return/` and `submission/` as subfolders,
because those are row actions on one entity rather than independent slices. When
code is about to reach across features, it usually belongs in one of three places:

- **`app/lib/`** — generic plumbing with no domain in it (`api/postJson`, `api/validate`, `api/resourceRoute.server`, `methodEnum`). Any feature may import from here.
- **`app/ui/`** — presentational components: props in, JSX out, no fetching and no domain logic. Any feature may import from here.
- **the slice that owns it** — a domain library used by exactly one feature lives inside that feature (the disc text parser sits in `discs/submission/parser/`).

Everything else that would be a `features/a` → `features/b` import means the two
belong in one slice.

## Database query file naming

> **Migration target, not the current state.** Existing DB code lives in `app/models/<domain>.server.ts` with `<Domain>Mapper.ts` classes. New DB code should follow the rules below; existing models are migrated opportunistically.

- All files that interact with the database must end in `.server.ts`
- File name starts with the function it exports:
  - `queryUserByEmail.server.ts`
  - `queryInsertMagicLinkToken.server.ts`
  - `queryMarkMagicLinkTokenUsed.server.ts`
- The exported function name mirrors the file name (camelCase)
- All DB interaction functions start with `query` — including inserts, updates, and deletes

```ts
// app/features/discs/queryDiscByExternalId.server.ts
export async function queryDiscByExternalId(supabase: SupabaseClient, externalId: string) { ... }
```

## Input objects for functions with more than 2 parameters

When a function takes more than 2 parameters, group them into a named `Input` type (declared locally in the same file):

```ts
type Input = {
  discId: string;
  templateId: string;
  sentAt: Date;
};

export async function queryInsertMessageLog(supabase: SupabaseClient, input: Input) { ... }
```

The first parameter (`supabase`, `request`, etc.) stays separate — only the domain-specific arguments are grouped.

## Explicit field selection over the wire

Never return full objects from loaders or actions. Always list fields explicitly to avoid leaking sensitive data:

```ts
// correct
return {
  disc: {
    id: disc.id,
    name: disc.name,
    color: disc.color,
  },
};

// avoid — may expose sensitive fields (phone numbers, tokens, etc.)
return {
  disc,
};
```

This applies to all data returned to the client — loaders, actions, and any JSON responses.

## Prefer existing UI components over custom CSS

Before writing custom CSS or inline styles, check `app/ui/` for existing UI components that already handle the styling. Always prefer composing existing components over creating custom CSS.

`app/ui/` is for generic, presentational components only. A component that fetches,
posts, or encodes a domain rule belongs in its feature — compare `ui/EmptyingLogItem`
(displays a log row) with `features/emptyingLog/AdminEmptyingLogItem` (posts the
"mark as emptied" form).

## File organization: important code first

- In React component files: component function at the top, StyleX styles at the bottom
- In any file: exported API (functions, types) before implementation details
