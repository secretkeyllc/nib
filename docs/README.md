# Nib Docs

`docs/` is a VitePress project. The published site starts at [`index.md`](index.md);
the repository's English technical source of truth remains organized under
`spec/` and `adr/`.

## Local commands

```bash
pnpm docs:dev
pnpm docs:build
pnpm docs:preview
pnpm docs:check
```

## Layout notes

- `spec/` and `adr/` are the English source of truth.
- `image/` holds pictures embedded by the repository READMEs. `public/` holds
  assets served by the site itself (brand mark, screenshots).
- `project/` keeps historical planning records; current status lives in the
  changelog and GitHub Issues.

## Entry points

- [English documentation site](index.md)
- [Quick guide](guide/index.md)
- [Specification index](spec/README.md)
- [ADR index](adr/README.md)
- [Plugin development](plugin-development.md)
- [Visual verification](project/2026-08-13-docs-redesign-verification.md)
