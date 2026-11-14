# Aviator — Design System (MASTER)

Global source of truth for the **user panel** (`frontend/src`, everything inside
`.user-shell`). Page files in `pages/` override this file for their page only.
Tokens live in `frontend/src/styles/tokens.css` — this document explains them;
the CSS is the implementation.

## Provenance (ui-ux-pro-max)

| Decision | Source | Status |
|---|---|---|
| Style: **Flat Design** | `--domain style "flat design bold"` → `flat-design` | Verified match; also the owner's "no gradient" requirement |
| Type: **Russo One / Chakra Petch** ("Gaming Bold") | `--domain typography "gaming bold energetic"` | Verified match (gaming, esports, entertainment) |
| Icons: **Phosphor** | skill default icon family | Inlined, see Icons |
| UX rules | skill Quick Reference §1–§9 | Applied below |
| Palette | owner requirement: one warm, bright, eye-catching dark scheme | **Overrides** the dataset's gaming palette (neon purple on cool navy), which conflicts with that requirement |
| Full `--design-system` output | two runs ("3D & Hyperrealism", "Claymorphism") | **Not adopted** — no verified fit (WebGL/3D, light pink kids' style) |

## Style — Flat Design

- Solid colours only. **No gradients** (`linear-`/`radial-`/`conic-gradient`) anywhere in UI.
- **No elevation shadows**, no glow, no decorative `backdrop-filter`. Separate layers with
  surface tone (`--bg` → `--surface` → `--surface-2` → `--surface-3`) and a 1px `--border`.
- Translucent solid tints are allowed (`rgb(var(--brand-rgb) / .14)`) — they are flat.
- Shape: radius `--r-xs 4` · `--r-sm 8` (controls) · `--r 12` (cards, posters) · `--r-pill`.
- One exception, page-scoped: the Aviator stage rays (see `pages/aviator-game.md`).

## Colour roles

| Role | Token | Use |
|---|---|---|
| Primary | `--brand` / `--on-brand` | The one primary CTA per view, active nav/chip, progress |
| Primary pressed | `--brand-lo` | Hover/pressed state of primary |
| Highlight | `--brand-hi` | Amounts, counters, emphasis words, focus ring |
| Accent | `--accent` / `--on-accent` | HOT badges, secondary promo |
| Background | `--bg` | Page (full-bleed, fixed layer) |
| Card / Muted / Selected | `--surface` / `--surface-2` / `--surface-3` | Cards · inputs & raised · hover/pressed/selected |
| Border | `--border` / `--border-strong` | Decorative dividers · control outlines (≥3:1) |
| Text | `--t1` / `--t2` / `--t3` | Primary · secondary · muted (all ≥4.5:1 on every surface) |
| Status | `--success` `--danger` `--info` | Always with text or icon — never colour alone |

Game posters use the fixed **artwork palettes** (`[data-art]` in tokens.css): `--art-a` is the
poster fill, `--art-b` the darker band. **Text on a poster always sits on `--art-b`**
(white ≥4.5:1 on every band); never put text on `--art-a`.

## Typography

- Display/headings: `--font-display` (Russo One, single weight — never fake-bold it).
- Body/UI: `--font-body` (Chakra Petch 400/500/600/700). Loaded in `index.html` with `display=swap`.
- Scale: `--text-xs 12` (absolute minimum, labels/badges only) · `14` · **`16` body** · `18` · `24` · `32`.
- Body line-height `--leading` 1.5; headings `--leading-tight`.
- Numbers that change (balances, multipliers, timers, counts): `font-variant-numeric: tabular-nums`.

## Icons

- Single family: **Phosphor** via `<Icon name weight size label?>` (`components/Icon.jsx`,
  paths inlined in `components/iconPaths.js`, MIT). No emoji as icons anywhere in UI chrome.
- Weight by hierarchy: `bold` = controls & inline UI; `fill` = bottom nav, chips/section
  headers, game artwork. Don't mix weights within one level.
- Sizes: 16 (sm) · 20 (md, default) · 24 (lg); bigger only for illustration.
- Decorative beside visible text → default (`aria-hidden`). Icon-only control → the
  `<button>` gets `aria-label`; meaningful standalone icon → `label` prop.

## Interaction & touch

- Every interactive element ≥ **44×44px** (`--tap`), ≥ 8px apart. If the visual is
  smaller, expand the hit area (padding / pseudo-element), not the glyph.
- `cursor: pointer`; `touch-action: manipulation`.
- Press feedback within 100ms: background → `--surface-3` (or `--brand-lo` on primary),
  optional `scale(.97)`. Never shift layout bounds.
- Visible focus: `outline: var(--focus-ring); outline-offset: 2px` on `:focus-visible`.
- Disabled: `opacity .45`, `cursor: not-allowed`, real `disabled` attribute.

## Motion

- Durations: `--dur-fast 150` (press/hover) · `--dur 200` (state) · `--dur-slow 300` (enter).
  Exit ≈ 60–70% of enter. Enter with `--ease-out`, leave with `--ease-in`; linear only for
  constant-rate progress (countdown bar) and rotation.
- Animate `transform`/`opacity` only. 1–2 animated elements per view.
- `prefers-reduced-motion: reduce` → no looping/decorative motion; state still visible.
- Auto-rotating content (banner) pauses on hover/focus, has a pause control, and does not
  auto-rotate under reduced motion.

## Layout

- Mobile-first, content column max `--shell-max` (480px), centred; page background is
  full-bleed `--bg`.
- 4/8 spacing rhythm (`--space-*`). Sections 24px apart; cards 10–12px gutters.
- No horizontal page scroll (horizontal *rows* of posters are fine: they snap and have
  ‹ › buttons as a non-swipe alternative).
- Fixed header/bottom nav reserve space for content and `env(safe-area-inset-*)`.
- Z-index only from the `--z-*` scale.

## Navigation

- Bottom nav: 5 items max, icon **and** label, active item in `--brand` + weight.
- Lobby state (category tab, search query) lives in the URL (`?tab=slots`, `?q=…`) so Back
  and deep links work; changing tab pushes history.

## Forms

- Visible `<label>` per field (no placeholder-only), inputs ≥ 44px high, 16px text
  (prevents iOS zoom), correct `type` and `autocomplete`.
- Validate on blur/submit; error text **below its field**, linked with `aria-describedby`,
  field gets `aria-invalid`. Server/global error in a `role="alert"` box at the top.
- Password fields have a show/hide toggle. Submit button disables + shows progress text.

## Lobby rules (product)

- A lobby row is never short: each category keeps ≥ 4 games.
- Grids never show an empty cell: the trailing **Load more** tile spans exactly the
  leftover cells (or a full row).

## Anti-patterns (do not ship)

Gradients · elevation/glow shadows · decorative blur · emoji as icons · text < 12px ·
targets < 44px · hover-only affordances · colour-only status · raw hex outside tokens.css ·
copying third-party game art or brands.
