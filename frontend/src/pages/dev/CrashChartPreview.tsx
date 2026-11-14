import { CrashChart } from '../../components/CrashChart/CrashChart';
import type { RoundState } from '../../components/CrashChart/useCrashRound';

/**
 * Standalone preview for CrashChart. It self-simulates by default, so this
 * page needs no backend and no auth.
 *
 * `?state=flying&m=2.53&t=4.2` pins the chart to one frame instead. Headless
 * browsers advance setInterval but not requestAnimationFrame timestamps, so
 * a live capture is stuck at x1.00 — pinning is the only way to screenshot
 * mid-flight and crashed states.
 */
function pinnedFromUrl(): RoundState | undefined {
  const params = new URLSearchParams(window.location.search);
  const phase = params.get('state');
  if (phase !== 'waiting' && phase !== 'flying' && phase !== 'crashed') return undefined;

  const multiplier = Number(params.get('m') ?? 1) || 1;
  const elapsed = Number(params.get('t') ?? 0) || 0;
  return {
    phase,
    multiplier,
    elapsed,
    crashPoint: phase === 'crashed' ? multiplier : null,
    waitProgress: phase === 'waiting' ? Number(params.get('w') ?? 1) : 0,
  };
}

const shell: React.CSSProperties = {
  minHeight: '100vh',
  background: '#0b0a1c',
  padding: 24,
  display: 'flex',
  flexDirection: 'column',
  gap: 24,
  alignItems: 'center',
};

/**
 * `?crash=100` scripts the crash point instead of sampling one at random,
 * which makes round length deterministic. Tests that need to measure the
 * growth curve need a round guaranteed to last long enough to measure.
 */
function simulationFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const crash = Number(params.get('crash'));
  if (!Number.isFinite(crash) || crash <= 1) return undefined;
  return { crashPoints: [crash] };
}

export function CrashChartPreview() {
  const pinned = pinnedFromUrl();
  const simulation = simulationFromUrl();

  return (
    <div style={shell}>
      <div style={{ width: '100%', maxWidth: 900 }}>
        <CrashChart round={pinned} simulation={simulation} />
      </div>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <CrashChart round={pinned} simulation={simulation} />
      </div>
    </div>
  );
}
