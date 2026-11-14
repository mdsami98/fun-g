/**
 * The plane that rides the tip of the Aviator flight path — our own
 * design (see design-system/aviator/pages/aviator-game.md).
 *
 * Drawn in a local 100-unit frame, facing right, with the TAIL-BOTTOM at
 * (0, 0) — that point is where the trail attaches. The parent <g> places
 * it with translate(tip) rotate(-tilt) scale(size / 100), so everything
 * here stays resolution-independent and rides the curve's tangent.
 *
 * Flat two-tone: every colour comes from a CSS class in aviatorTheme.css
 * (hull --brand, wings/tail --brand-lo, solid canopy), so no per-instance
 * gradient ids are needed — it is also safe as the pre-round logo mark.
 */
export function FlightPlane() {
  return (
    <g className="aviator-plane">
      <g className="aviator-plane-body">
        {/* tail fin + tailplane */}
        <path className="aviator-plane-dark" d="M0 0 L5 -29 Q6 -32 9 -32 L19 -32 Q21 -32 21 -29 L24 -9 Z" />
        <path className="aviator-plane-dark" d="M2 -2 L27 -4 L20 4 Q19 5 17 5 L4 3 Z" />

        {/* fuselage: slim at the tail, chunky rounded nose */}
        <path
          className="aviator-plane-hull"
          d="M0 0 C14 -18 40 -24 70 -24 C88 -24 96 -16 95 -9 C94 -1 84 2 70 2 C44 3 18 5 0 0 Z"
        />

        {/* racing stripe */}
        <path className="aviator-plane-stripe" d="M9 -4 C28 -12 60 -15 91 -12" />

        {/* canopy */}
        <path className="aviator-plane-glass" d="M50 -23 C52 -36 72 -37 78 -22.5 Z" />
        <path className="aviator-plane-glint" d="M57 -27 C59 -32 65 -33.5 69 -31.5" />

        {/* wing, swept toward the viewer in 3/4 view */}
        <path className="aviator-plane-dark" d="M36 -6 L72 -8 L61 12 Q60 13 57 13 L45 13 Q43 13 43 11 Z" />

        {/* nose cone + spinning propeller */}
        <circle className="aviator-plane-nose" cx="95" cy="-9" r="4.2" />
        <ellipse className="aviator-plane-prop" cx="99" cy="-9" rx="2" ry="16" />
      </g>
    </g>
  );
}
