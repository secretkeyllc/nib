# docs/plugin-plan — Plugin Slot & Render API & Runtime Hook Catalog

This directory records, for each UI slot, each renderer-facing interface, and
each plugin-facing agent-runtime hook, what the host promises a plugin and what
a plugin may do with it.

Parent policy is `/AGENTS.md`. Domain specifications under `docs/spec/` remain
the source of truth for real behavior; this catalog is review material and
working notes. When they disagree, verify the code and fix this catalog.

## Layout

Classification is by kind, not by issue.

```text
docs/plugin-plan/
  AGENTS.md            this file
  index.html           the only complete list; every existing folder is linked
  slot-contract.html   shared contract for all UI slots
  ui/<slot-id>/        one UI slot             e.g. ui/user-action
  render/<api-id>/     one renderer interface  e.g. render/draft
  runtime/<contract-id>/  one runtime hook or session data contract
                          e.g. runtime/before-send, runtime/session-context
  host-api/<api-id>/   one callable host API or lifecycle hook (implemented
                        surface; the title was once "existing capability") e.g. host-api/fs.readText
```

Folder id is lowercase-kebab and must match the name the SDK will use. Titles,
prose, ids, field names, code, and commit messages are all English.

## Required files per folder

Every folder carries its own `index.html` first. It lists the pages in that
folder, the status, and what the folder covers.

| file | answers |
|---|---|
| `index.html` | what this folder covers, and links to the pages below |
| `requirements.html` | scope, slot shape or contract, named scenarios, explicit non-goals, decisions |
| `demo.html` | what it looks like (UI slots only) |
| `data-flow.html` | how data moves, and where the feature sits in a plugin |

`data-flow.html` is required when the host has data plumbing (fixed data
formats, host components, callable operations). A folder where the host hands
raw content over once and the plugin owns everything else may omit it; record
the omission in that folder's `index.html` and `requirements.html`.

`demo.html` is required for UI slots. Runtime hooks have no UI and omit it;
record `Omitted: no UI` in `index.html` and `requirements.html`.

## Top navigation

Every page carries the same navigation strip at the very top:

- Left: the folder's parent chain, ending in the current folder.
- Right: the sibling pages that actually exist.
- Exactly one `aria-current="page"` per document.

Keep the markup and class name (`plan-nav`) identical across pages.

`data-flow.html` carries these sections, in this order, in plain language:

1. **Interface contract** — what data the plugin gets, which host components it can use, which operations it can call, permission name
2. **How the data moves** — who passes what, in which direction, over what lifetime
3. **What happens on failure** — thrown error, unload, edit mode
4. **What is not provided** — what this position deliberately does NOT provide (include host guarantees / accepted costs when isolation matters)
5. **Related entries** — neighbouring slots and core APIs, by folder path
6. **Open questions** — unanswered questions, one screen maximum

## Status

`draft` · `decided` · `implemented`

Status appears in `index.html` and as an HTML comment on line 1 of each file.

## Writing rules

- Separate **user decided** from **agent proposal**. Never blur them into one list.
- No empty folders. Items without a folder appear in `index.html` only.
- Self-contained pages: one file each, no build step, no external assets.
- No narration in `demo.html`. Stage hints are short phrases only.
- Write in plain language. Table headers and section titles included.
  - Say `the whole message bubble`, not `bubble core`; say `ready-made component`, not `building block`; say `failure isolation`, not `error boundary`; say `callable operation`, not `action closure`.
- Code citations use `branch@sha · path · symbol`, never bare line numbers alone.
- Do not restate an ADR or a spec as if this catalog were authoritative.
- No deprecation banners or version-history sections. The catalog is current-state only.
