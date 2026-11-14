# Page override — Aviator game (`/aviator`, `pages/user/AviatorGame.jsx`)

Inherits MASTER. Overrides:

- **Stage exception**: near-black stage with broad rays from the bottom-left corner,
  requested by the owner. The rays are a hard-edged stripe pattern (`repeating-conic-gradient`
  with hard stops), not a colour blend; no other gradient is allowed on this page. Rays rotate
  only while a round is running and never under reduced motion.
- **Flight path**: solid translucent area fill + solid line; no gradient stops.
- **Plane** (`FlightPlane`): our own design — flat, two-tone (`--brand` body, `--brand-lo`
  wings/tail, solid canopy). Never replace it with third-party game art.
- **Pre-round screen**: plane mark + AVIATOR (Russo One) + tagline + solid countdown bar
  (`--brand` on `--surface-3`, linear) + badge.
- **Primary CTA**: one per state — Place bet (`--brand`), Cash out (`--success` + text).
