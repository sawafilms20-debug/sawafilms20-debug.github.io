# DESIGN.md — Raheeq Kanjo brand system (from CV at raheeqkanjo.surge.sh)

## Color (CV-derived, mandatory)
- --ivory: #f7f2e9 (page background)
- --paper: #fffdf8 (sheet surface)
- --espresso: #2b2622 (headings)
- --ink: #3a342e (body)
- --muted: #7a7167
- --gold: #c79a3b (primary accent)
- --gold-deep: #b1842a
- --gold-soft: #e7d3a0
- --line: #e4dccd (hairlines)
- --sand: #efe7d6
Strategy: Committed warm ivory+gold. Gold carries identity (rules, numerals, rings, ink strokes). Espresso for type. No pure black/white.

## Typography
- Headings: 'El Messiri' (serif-feel Arabic display), weights 500–700.
- Body: 'Tajawal', weights 300–700. Line-height ~1.85 for Arabic body.
- Fluid clamp() scales for display type; ratio ≥1.3 between steps.

## Texture & surfaces
- Paper dot-grain overlay (radial-gradient 1px dots, multiply, very low alpha).
- Soft radial ivory washes on the page background.
- Hairline borders (--line), 22px radii on sheets, warm long-throw shadows rgba(70,55,30,.35).
- Gold conic-gradient ring around the avatar (from CV).

## Motifs
- Manuscript/screenplay: section eyebrows styled like scene sluglines, chapter numerals in Arabic-Indic digits, ink underline strokes (hand-drawn SVG), typewriter caret.

## Motion
- IntersectionObserver reveals, staggered, ease-out expo, 500–800ms.
- Counter roll-up for stats. No bounce, no parallax gimmicks. Respect prefers-reduced-motion.

## Layout
- RTL, max content width ~1100px, asymmetric editorial compositions, generous clamp() spacing.
