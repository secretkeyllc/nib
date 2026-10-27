# Nib brand assets

| File | Use |
|---|---|
| `logo-black.png` | Dark glyph for light surfaces |
| `logo-white.png` | White glyph for dark surfaces |
| `logo-gray.png` | Neutral glyph for favicons and anywhere both themes apply |


## Rules

- The mark is the SecretKey network glyph: one large node with three connected smaller nodes.
- Source of truth: `secretkey.llc/wp-content/uploads/2026/10/logo_icon_{black,white,gray}.png` (270x270, transparent). Copy these files as-is. Do not retrace, redraw, rotate, or re-crop them; scale proportionally only.
- Pick the variant that matches the surface: white on dark, black on light, gray when both are possible.
- Accent colour (`#FF5C35`) is for interactive states and a single highlight, never for the whole mark.
- Minimum size: 24px for layouts. For favicons reference the same PNG and let the browser scale it, which is what sk2b does.
- Clear space: at least half the mark's height on every side.
- Do not stretch, rotate, outline, add gradients, or place the mark on a busy photo.
- Always write the name as `Nib` in prose and `nib` in commands. Never `NIB`, `Nib CLI`, or `SkNib`.

## Palette

| Token | Hex | Use |
|---|---|---|
| Ink | `#08090B` | Primary background |
| Ink 2 | `#0F1115` | Cards, panels |
| Line | `#22262E` | Hairlines |
| Paper | `#F4F1EA` | Primary text on dark |
| Muted | `#8B909A` | Secondary text |
| Ember | `#FF5C35` | Accent, CTA, cursor |
| Mint | `#6FE3C4` | Success, remaining credits |

Typography: system sans for UI, system mono for commands and code. No display serif, no rounded friendly fonts.

Voice: short sentences, concrete verbs, no hype. Say what the tool does, not how it will change your life.
