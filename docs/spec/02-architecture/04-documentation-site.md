# Documentation site

## Status

Accepted. See [ADR 0079](../../adr/0079-vitepress-documentation-site.md).

## Decision

The `docs/` directory is a standalone VitePress project inside the pnpm
workspace. Markdown remains the source of truth; VitePress supplies the local
development server, static build, local search index, code highlighting, and
versioned navigation shell.

The site is published in English only:

- `/` — the complete documentation navigation.

For Vercel deployments whose Root Directory is `docs`, `docs/vercel.json`
declares the VitePress build output as `.vitepress/dist` and enables Vercel's
`cleanUrls` routing. This keeps extensionless links such as `/spec/README` and
`/adr/README` working after a direct page refresh instead of becoming static
hosting 404s.

Existing `spec/`, `adr/`, `project/`, and guide Markdown files remain in place
so repository links and review history stay stable.

## Local commands

```bash
pnpm docs:dev
pnpm docs:build
pnpm docs:preview
pnpm docs:check
```

The production build is static and does not require a runtime service. The
site may load Google Fonts during development or deployment, but the content
and search index are generated locally by VitePress.

`pnpm docs:check` runs `scripts/check-docs.mjs`, a gate over every Markdown
page under `docs/`:

1. exactly one H1, except that a `layout: home` page renders its hero instead,
2. balanced code fences, and tables whose rows agree on their column count,
3. the ADR catalog: an `NNNN-slug.md` (or plain slug) file name, one owner per
   decision id, an H1 that declares that id, and the Status, Context, and
   Decision sections,
4. `adr/README.md`, which must list every record exactly once, and may only
   link a row to the record that owns its id,
5. every `ADR NNNN` citation under `docs/`, which must resolve to a record, or
   to a retired id that `08-meta/decisions-log.md` names,
6. `NAV.md`, which must list every page of its own tree, and the `spec/` tree,
   whose section directories must stay numbered like `01-product`.

The same workflow then runs the VitePress production build, which validates the
rendered routes and every internal link.

## Content rules

1. English is the canonical language for specs, ADRs, code identifiers, and
   protocol terms.
2. The sidebar is derived from the Markdown tree so a new specification cannot
   be omitted from deep navigation by accident.
3. User-visible or protocol-visible documentation behavior belongs in the E2E
   test plan.
4. Navigation should expose the shortest useful path; deep files remain
   searchable and directly linkable.
