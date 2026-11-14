# Page override — Lobby (Home: `/`, `pages/user/Home.jsx`)

Inherits MASTER. Overrides / additions:

- **Header stack**: search (48px high) → category chips (44px, `fill` icons) → content.
- **Poster card** (`GameCard`): 3:4, `--r`, flat. Top area `--art-a` with the game's Phosphor
  `fill` icon drawn in `--art-b` (tonal, no white-on-light). Bottom solid `--art-b` band holds
  the title (Russo One, white) and the meta row (provider · players, ≥12px). Badges ≥12px,
  solid fills (`--accent` HOT, `--success` NEW, `--info` LIVE + text).
- **Rows**: 3 posters visible + a peek; scroll-snap; ‹ › buttons and **All** are 44px.
- **Banner**: solid colour per slide (`--accent`, `--brand`, `--brand-hi`), Phosphor art,
  auto-rotates every 5s, pauses on hover/focus, has a pause/play control, and does not
  auto-rotate under reduced motion.
