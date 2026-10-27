# Nib brand assets

| File | Use |
|---|---|
| `logo-mark.svg` | App icon, favicon, terminal banner, social avatar (270x270 canvas, native aspect) |


## Rules

- The mark is the SecretKey network glyph: one large node with three connected smaller nodes.
- Source of truth: `secretkey.llc/wp-content/uploads/2026/10/logo_icon_{black,white,gray}.png` (270x270, transparent). The SVG is traced from the black variant at 4x supersampling; do not redraw it by hand.
- It inherits `currentColor`. On dark surfaces use `#F4F1EA`; on light surfaces use `#08090B`.
- Accent colour (`#FF5C35`) is for interactive states and a single highlight, never for the whole mark.
- Minimum size: 24px. Below that the connector strokes blur, so favicons are pre-rendered PNGs at 16/32/48.
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
