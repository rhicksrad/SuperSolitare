Joker SVG Guidelines
====================

Sizing
- Artboard: 96×96 px (square). Larger is fine if it scales cleanly to 96×96.
- Keep important shapes inside an 80×80 px safe area centered in the artboard.

Style
- Flat shapes, limited gradients, high-contrast edges.
- Avoid tiny details; aim to read at 48×48.
- Use currentColor-compatible fills when possible for easy theming.

Color
- Prefer neutral base with one accent; the app background varies by theme.
- Avoid pure white backgrounds; use transparent background.

File
- Single SVG per joker named by its `id`, e.g. `early-bird.svg`.
- No embedded rasters; optimize paths; remove metadata.

Accessibility
- Include `<title>` with the joker name; keep IDs unique.


