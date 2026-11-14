/* ============================================================
   AVIATOR FLIGHT PATH — geometry only, no React, no styling.

   Everything here works in PIXELS, not in a stretched viewBox. The
   canvas SVG used to be drawn with preserveAspectRatio="none", which
   scales x and y by different factors; that is fine for a plain stroke
   but wrong the moment the shape needs perpendicular offsets — a
   tapered ribbon would come out skewed, and its thickness would change
   with the canvas aspect. Working in pixels keeps the ribbon's width
   true and lets the arrowhead share the same coordinate space, which
   is what keeps the two visually welded together.
   ============================================================ */

/* Saturation caps for the arrow tip, as a % of the box. Both axes
   approach these asymptotically, so the path can never leave the box:
       p(t) = 1 - e^(-k·t)      t = multiplier - 1,  p → 1 but never 1
   X saturates fast so the arrow parks at ~8/10 across; Y keeps
   climbing on a slower curve. */
const X_MAX = 82;
const Y_MAX = 76;
const KX = 1.15;
const KY = 0.42;

/* Bézier control point placement, as a fraction of the span from the
   origin to the tip. Low CTRL_Y keeps the tail flat near the origin
   then sweeps up — the shape in the reference. */
const CTRL_X = 0.62;
const CTRL_Y = 0.16;

/* Ribbon half-width in px: thin at the origin, thick at the tip. */
const HALF_W_START = 0.7;
const HALF_W_END = 5.5;
const TAPER_EXP = 1.25;

/* Arrowhead, in px, measured from the curve's end point along the
   tangent. The end point sits on the arrow's BACK EDGE, not at its
   centre: the head extends forward along the curve (a safe direction,
   into open box) and only its barbs reach sideways. Straddling the end
   point instead would hang the rear barbs behind and below it, which is
   what pokes through the floor when the arrow is parked at the corner. */
const ARROW_LEN = 17;
const ARROW_WING = 10.5;
const ARROW_NOTCH = 4.5;

/* The curve STARTS AT THE CORNER. Only a hair of inset, to keep the
   ribbon's own width from bleeding through the canvas's rounded edge. */
const ORIGIN_INSET = 2;

/* The arrowhead is drawn AROUND the curve's end point, so parking the tip
   on the origin would push its barbs outside the box. Rather than moving
   the origin (which visibly detaches the tail from the corner), the TIP
   gets a floor: at 1.00x it already sits ARROW_CLEARANCE along the curve,
   leaving a short stub of tail behind it — exactly how the reference
   looks at x1.00. The tail still starts at 0,0. */
/* With the back edge on the end point, the furthest the head reaches
   away from the curve is one wing. Clearing that on each axis is enough
   to keep the parked arrow inside the corner. */
const ARROW_CLEARANCE = ARROW_WING + 1.5;

const SAMPLES = 56;

/** Axis progress at an elapsed-parameter t (t = multiplier - 1). */
function progressAt(t) {
  return { fx: 1 - Math.exp(-KX * t), fy: 1 - Math.exp(-KY * t) };
}

/** Progress along each axis for a given multiplier. 1.00x → 0. */
export function flightProgress(multiplier) {
  return progressAt(Math.max(0, Number(multiplier || 1) - 1));
}

/**
 * Head start: the t at which the tip is ARROW_CLEARANCE px from the
 * origin. Distance grows monotonically in t, so a plain bisection is
 * exact enough and costs ~30 exp() calls per frame.
 */
function headStart(spanX, spanY) {
  /* Clearance is needed on EACH axis independently, not as a straight-line
     distance: the curve leaves the origin at a shallow angle, so travelling
     far enough diagonally still leaves the arrow only a few px above the
     floor. Gate on the slower axis. */
  const distAt = (t) => {
    const { fx, fy } = progressAt(t);
    return Math.min(spanX * fx, spanY * fy);
  };
  let lo = 0;
  let hi = 1;
  while (distAt(hi) < ARROW_CLEARANCE && hi < 64) hi *= 2;
  for (let i = 0; i < 30; i += 1) {
    const mid = (lo + hi) / 2;
    if (distAt(mid) < ARROW_CLEARANCE) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Tip position as a % of the box, bottom-left origin. Exported for tests. */
export function flightPoint(multiplier) {
  const { fx, fy } = flightProgress(multiplier);
  return { x: X_MAX * fx, y: Y_MAX * fy };
}

function quadAt(o, c, p, t) {
  const u = 1 - t;
  return {
    x: u * u * o.x + 2 * u * t * c.x + t * t * p.x,
    y: u * u * o.y + 2 * u * t * c.y + t * t * p.y,
  };
}

function quadTangent(o, c, p, t) {
  const u = 1 - t;
  return {
    x: 2 * u * (c.x - o.x) + 2 * t * (p.x - c.x),
    y: 2 * u * (c.y - o.y) + 2 * t * (p.y - c.y),
  };
}

function normalize(v, fallback) {
  const len = Math.hypot(v.x, v.y);
  if (len < 1e-6) return fallback ?? { x: 1, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

/* At 1.00x the tip sits exactly on the origin, so the Bézier is
   degenerate and its tangent is the zero vector — normalising that would
   collapse every arrow vertex onto a point and the arrow would vanish.
   The fix is not "point it level": that snaps ~23 degrees the instant the
   round starts. Use the direction the curve is ABOUT to take, i.e. the
   limit of the tangent as t → 0+, so the takeoff angle is continuous.
   Derived from the same constants the curve itself uses. */
function takeoffDir(w, h, origin) {
  return normalize({
    x: (w - origin.x) * X_MAX * KX * (1 - CTRL_X),
    y: -origin.y * Y_MAX * KY * (1 - CTRL_Y),
  });
}

const fmt = (n) => (Math.round(n * 100) / 100).toFixed(2);

/**
 * Build the full path for one frame.
 *
 * @param {number} multiplier current (or crash) multiplier
 * @param {number} w canvas width in px
 * @param {number} h canvas height in px
 * @returns {{ribbonD:string, areaD:string, arrowD:string, tip:{x:number,y:number}, angle:number}|null}
 */
export function buildFlightPath(multiplier, w, h) {
  if (!w || !h) return null;

  const tRaw = Math.max(0, Number(multiplier || 1) - 1);

  // SVG space: y grows downward, so the origin is at the BOTTOM left.
  const origin = { x: ORIGIN_INSET, y: h - ORIGIN_INSET };

  // Full travel available to the tip on each axis.
  const spanX = ((w - origin.x) * X_MAX) / 100;
  const spanY = (origin.y * Y_MAX) / 100;

  /* The parked arrow must clear the corner, but pushing each axis out by
     an equal amount lands the tip OFF the natural curve — it starts at a
     steep angle and then rocks back as the round begins. Instead, shift
     the whole thing forward in TIME: find the head start t0 at which the
     tip is already ARROW_CLEARANCE from the origin, and add it to every
     later t. The tip then never leaves its own locus, so the takeoff
     angle is the curve's real angle there and only ever increases. */
  const t0 = headStart(spanX, spanY);
  const shifted = progressAt(tRaw + t0);
  const tip = {
    x: origin.x + spanX * shifted.fx,
    y: origin.y - spanY * shifted.fy,
  };
  const control = {
    x: origin.x + (tip.x - origin.x) * CTRL_X,
    y: origin.y - (origin.y - tip.y) * CTRL_Y,
  };

  const fallbackDirForRibbon = takeoffDir(w, h, origin);

  // Walk the curve once, collecting both offset edges of the ribbon.
  const top = [];
  const bottom = [];
  for (let i = 0; i <= SAMPLES; i += 1) {
    const t = i / SAMPLES;
    const point = quadAt(origin, control, tip, t);
    const dir = normalize(quadTangent(origin, control, tip, t), fallbackDirForRibbon);
    const normal = { x: -dir.y, y: dir.x };
    const halfW = HALF_W_START + (HALF_W_END - HALF_W_START) * Math.pow(t, TAPER_EXP);
    top.push({ x: point.x + normal.x * halfW, y: point.y + normal.y * halfW });
    bottom.push({ x: point.x - normal.x * halfW, y: point.y - normal.y * halfW });
  }

  // Ribbon: out along one edge, back along the other.
  let ribbonD = `M ${fmt(top[0].x)} ${fmt(top[0].y)}`;
  for (let i = 1; i < top.length; i += 1) ribbonD += ` L ${fmt(top[i].x)} ${fmt(top[i].y)}`;
  for (let i = bottom.length - 1; i >= 0; i -= 1) {
    ribbonD += ` L ${fmt(bottom[i].x)} ${fmt(bottom[i].y)}`;
  }
  ribbonD += ' Z';

  // Translucent area between the curve and the floor. It starts at the
  // canvas's own bottom-left CORNER, not at the inset origin — otherwise
  // the fill's left edge sits 18px in and reads as a visible step.
  const areaD =
    `M 0 ${fmt(h)}` +
    ` L ${fmt(origin.x)} ${fmt(origin.y)}` +
    ` Q ${fmt(control.x)} ${fmt(control.y)} ${fmt(tip.x)} ${fmt(tip.y)}` +
    ` L ${fmt(tip.x)} ${fmt(h)} Z`;

  // Arrowhead, built in the tangent frame so it always rides the curve.
  const fallbackDir = takeoffDir(w, h, origin);
  const dir = normalize(quadTangent(origin, control, tip, 1), fallbackDir);
  const normal = { x: -dir.y, y: dir.x };
  const at = (along, across) => ({
    x: tip.x + dir.x * along + normal.x * across,
    y: tip.y + dir.y * along + normal.y * across,
  });
  const nose = at(ARROW_LEN, 0);
  const wingA = at(0, ARROW_WING);
  const notch = at(ARROW_NOTCH, 0);
  const wingB = at(0, -ARROW_WING);
  const arrowD =
    `M ${fmt(nose.x)} ${fmt(nose.y)}` +
    ` L ${fmt(wingA.x)} ${fmt(wingA.y)}` +
    ` L ${fmt(notch.x)} ${fmt(notch.y)}` +
    ` L ${fmt(wingB.x)} ${fmt(wingB.y)} Z`;

  const angle = (Math.atan2(-dir.y, dir.x) * 180) / Math.PI;

  return { ribbonD, areaD, arrowD, tip, angle };
}

export const FLIGHT_LIMITS = { X_MAX, Y_MAX, ARROW_LEN, ARROW_WING };
