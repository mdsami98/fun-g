/* ============================================================
   CRASH CHART — pure geometry. No React, no DOM, no styling.
   Everything works in the SVG's own pixel space.
   ============================================================ */

export interface Point {
  x: number;
  y: number;
}

export interface ChartBox {
  /** Full SVG width/height in user units. */
  width: number;
  height: number;
  /** Space reserved for the y-axis labels on the left. */
  padLeft: number;
  padRight: number;
  padTop: number;
  padBottom: number;
}

/* padRight reserves the column the live bet feed floats in. Without it the
   curve runs on underneath the pills and, at high multipliers, the
   arrowhead ends up completely hidden behind them. Keep this in sync with
   the feed's width in crashChart.css. */
export const FEED_COLUMN_FRACTION = 0.26;

export const DEFAULT_BOX: ChartBox = {
  width: 800,
  height: 450,
  padLeft: 46,
  padRight: Math.round(800 * FEED_COLUMN_FRACTION),
  padTop: 28,
  padBottom: 26,
};

/** Arrowhead size, in user units. */
const ARROW_LEN = 26;
const ARROW_WING = 16;
const ARROW_NOTCH = 7;

/** Curve sampling resolution. 64 is smooth at any realistic chart size. */
const SAMPLES = 64;

/**
 * Vertical scale. The axis grows in steps so early flight uses the whole
 * chart height and tall rounds still fit — without this, x1.00–x1.20 would
 * be a flat line hugging the floor.
 */
export function axisTop(multiplier: number): number {
  const steps = [1.5, 2, 2.5, 3, 4, 5, 7.5, 10, 15, 20, 30, 50, 75, 100];
  for (const step of steps) {
    if (multiplier <= step * 0.92) return step;
  }
  // Beyond the table, keep rounding up to the next power-ish step.
  return Math.ceil(multiplier / 50) * 50;
}

/**
 * Tick values for the y-axis. Steps start at 0.5 so labels read x1, x1.5,
 * x2, x2.5 as specced — a finer step like 0.25 renders as "x1.3" once
 * formatted to one decimal, which is simply a wrong label.
 */
export function axisTicks(top: number): number[] {
  const rawStep = (top - 1) / 4;
  const step = [0.5, 1, 2.5, 5, 10, 25, 50, 100].find((s) => s >= rawStep) ?? rawStep;

  /* Ticks land on MULTIPLES of the step, not on 1 + n·step. Counting up
     from the baseline gives x1, x3.5, x6, x8.5 for a 2.5 step — technically
     spaced, but not numbers anyone reads off a chart. */
  const ticks = [1];
  for (let v = Math.ceil(1 / step) * step; v <= top + 1e-9; v += step) {
    const value = Math.round(v * 100) / 100;
    if (value > 1 + 1e-9) ticks.push(value);
  }
  return ticks;
}

/** Axis label text. Never rounds away a meaningful digit. */
export function formatTick(tick: number): string {
  return `x${Number.isInteger(tick) ? tick : tick.toFixed(1)}`;
}

/**
 * Curve shape. `p` is normalised round progress (0..1 across the plotted
 * width); the return is normalised height (0..1). Quadratic-in-p, so the
 * line leaves the origin shallow and steepens — the classic crash curve.
 */
function curveShape(p: number): number {
  return p * p * 0.78 + p * 0.22;
}

export interface PlotResult {
  /** Stroked centre line. */
  lineD: string;
  /** Closed area between the line and the floor. */
  areaD: string;
  /** Arrowhead at the head of the curve. */
  arrowD: string;
  /** Head position, in user units. */
  head: Point;
  /** Head direction, degrees, negative = climbing. */
  angle: number;
  /** Total length of the sampled line, for stroke-dash animation. */
  length: number;
}

function fmt(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

/**
 * Build every path for one frame.
 *
 * @param progress 0..1 — how far across the plot the head has travelled
 * @param heightFrac 0..1 — how high the head sits, after axis scaling
 */
export function plotCurve(box: ChartBox, progress: number, heightFrac: number): PlotResult {
  const x0 = box.padLeft;
  const y0 = box.height - box.padBottom;
  const plotW = box.width - box.padLeft - box.padRight;
  const plotH = box.height - box.padTop - box.padBottom;

  const p = Math.max(0, Math.min(1, progress));
  const hf = Math.max(0, Math.min(1, heightFrac));

  // Sample the curve. The shape is fixed; `hf` scales its height so the
  // head lands exactly on the multiplier's position on the axis.
  const pts: Point[] = [];
  for (let i = 0; i <= SAMPLES; i += 1) {
    const t = (i / SAMPLES) * p;
    const shape = p > 0 ? curveShape(t) / (curveShape(p) || 1) : 0;
    pts.push({
      x: x0 + plotW * t,
      y: y0 - plotH * hf * shape,
    });
  }

  let lineD = `M ${fmt(pts[0].x)} ${fmt(pts[0].y)}`;
  let length = 0;
  for (let i = 1; i < pts.length; i += 1) {
    lineD += ` L ${fmt(pts[i].x)} ${fmt(pts[i].y)}`;
    length += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }

  const head = pts[pts.length - 1];
  const areaD = `${lineD} L ${fmt(head.x)} ${fmt(y0)} L ${fmt(x0)} ${fmt(y0)} Z`;

  // Direction from the last short segment, with a fallback for the
  // degenerate first frame where every sample sits on the origin.
  const prev = pts[Math.max(0, pts.length - 4)];
  let dx = head.x - prev.x;
  let dy = head.y - prev.y;
  if (Math.hypot(dx, dy) < 1e-6) {
    dx = 1;
    dy = -curveShape(0.02) * plotH * 0.5;
  }
  const len = Math.hypot(dx, dy) || 1;
  const dir = { x: dx / len, y: dy / len };
  const normal = { x: -dir.y, y: dir.x };

  const at = (along: number, across: number): Point => ({
    x: head.x + dir.x * along + normal.x * across,
    y: head.y + dir.y * along + normal.y * across,
  });
  // Back edge sits ON the head, so the arrow extends forward along the
  // curve and its barbs never reach behind into the plotted area.
  const nose = at(ARROW_LEN, 0);
  const wingA = at(0, ARROW_WING);
  const notch = at(ARROW_NOTCH, 0);
  const wingB = at(0, -ARROW_WING);
  const arrowD =
    `M ${fmt(nose.x)} ${fmt(nose.y)} L ${fmt(wingA.x)} ${fmt(wingA.y)}` +
    ` L ${fmt(notch.x)} ${fmt(notch.y)} L ${fmt(wingB.x)} ${fmt(wingB.y)} Z`;

  const angle = (Math.atan2(dir.y, dir.x) * 180) / Math.PI;

  return { lineD, areaD, arrowD, head, angle, length };
}

/** Y pixel for a given multiplier under the current axis top. */
export function multiplierToY(box: ChartBox, multiplier: number, top: number): number {
  const y0 = box.height - box.padBottom;
  const plotH = box.height - box.padTop - box.padBottom;
  const frac = (multiplier - 1) / (top - 1);
  return y0 - plotH * Math.max(0, Math.min(1, frac));
}
