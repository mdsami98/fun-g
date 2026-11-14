import { useId, useMemo } from 'react';
import {
  DEFAULT_BOX,
  axisTicks,
  axisTop,
  formatTick,
  multiplierToY,
  plotCurve,
  type ChartBox,
} from './geometry';
import { StartScreen } from './StartScreen';
import { useBetFeed } from './useBetFeed';
import { useCrashRound, type CrashRoundOptions, type RoundState } from './useCrashRound';
import './crashChart.css';

export interface CrashChartProps {
  /** Drive the chart externally (e.g. from a socket). Omit to self-simulate. */
  round?: RoundState;
  /** Options for the built-in simulator. Ignored when `round` is supplied. */
  simulation?: CrashRoundOptions;
  /** Override the SVG coordinate box. */
  box?: ChartBox;
  className?: string;
}

/** How far across the plot the head has travelled, 0..1. */
function progressFor(state: RoundState): number {
  if (state.phase === 'waiting') return 0;
  // Ease toward the right edge so the head never runs off the end.
  return 1 - Math.exp(-state.elapsed / 5.5);
}

const DEFAULT_WAIT_MS = 8000;

export function CrashChart({ round, simulation, box = DEFAULT_BOX, className }: CrashChartProps) {
  // Hooks must run unconditionally; the simulated value is simply ignored
  // when a caller supplies `round`.
  const simulated = useCrashRound(simulation);
  const state = round ?? simulated;

  const feed = useBetFeed(state.phase);

  // Unique gradient/filter ids so several charts can coexist on a page.
  const uid = useId().replace(/:/g, '');

  const top = useMemo(() => axisTop(state.multiplier), [state.multiplier]);
  const ticks = useMemo(() => axisTicks(top), [top]);

  const heightFrac = Math.max(0, Math.min(1, (state.multiplier - 1) / (top - 1)));
  const plot = useMemo(
    () => plotCurve(box, progressFor(state), heightFrac),
    [box, state, heightFrac],
  );

  const crashed = state.phase === 'crashed';
  const flying = state.phase === 'flying';

  return (
    <div className={`cc-root${crashed ? ' is-crashed' : ''}${className ? ` ${className}` : ''}`}>
      <div className="cc-frame">
        <svg
          className="cc-svg"
          viewBox={`0 0 ${box.width} ${box.height}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`Multiplier ${state.multiplier.toFixed(2)}x${crashed ? ', crashed' : ''}`}
        >
          <defs>
            <linearGradient id={`${uid}-stroke`} x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" className="cc-stop-a" />
              <stop offset="55%" className="cc-stop-b" />
              <stop offset="100%" className="cc-stop-c" />
            </linearGradient>

            <linearGradient id={`${uid}-area`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" className="cc-area-top" />
              <stop offset="100%" className="cc-area-bottom" />
            </linearGradient>

            {/* Neon glow. Blur a copy of the shape and lay the crisp
                original back on top, so the line stays sharp. */}
            <filter id={`${uid}-glow`} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="7" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid lines + y-axis labels */}
          <g className="cc-grid">
            {ticks.map((tick) => {
              const y = multiplierToY(box, tick, top);
              return (
                <g key={tick}>
                  <line x1={box.padLeft} y1={y} x2={box.width - box.padRight} y2={y} />
                  <text x={box.padLeft - 10} y={y + 4} textAnchor="end">
                    {formatTick(tick)}
                  </text>
                </g>
              );
            })}
          </g>

          {state.phase !== 'waiting' && (
            <>
              <path className="cc-area" d={plot.areaD} fill={`url(#${uid}-area)`} />
              <path
                className="cc-line"
                d={plot.lineD}
                stroke={`url(#${uid}-stroke)`}
                filter={`url(#${uid}-glow)`}
              />
              <path className="cc-arrow" d={plot.arrowD} filter={`url(#${uid}-glow)`} />
            </>
          )}
        </svg>

        {/* Multiplier readout */}
        <div className="cc-readout">
          <div className="cc-multiplier">x{state.multiplier.toFixed(2)}</div>
          {crashed && <div className="cc-crashed">Crashed</div>}
        </div>

        {/* Live bet feed */}
        <div className="cc-feed">
          {feed.map((bet) => (
            <div className="cc-feed-row" key={bet.id}>
              <span className="cc-feed-id">{bet.label}</span>
              <span className="cc-feed-amount">{bet.amount.toFixed(2)}</span>
              <span className="cc-feed-cur">BDT</span>
            </div>
          ))}
        </div>

        {flying && <div className="cc-elapsed">Total time {state.elapsed.toFixed(1)}s</div>}

        {state.phase === 'waiting' && (
          <StartScreen
            progress={state.waitProgress}
            totalSeconds={(simulation?.waitMs ?? DEFAULT_WAIT_MS) / 1000}
          />
        )}
      </div>
    </div>
  );
}
