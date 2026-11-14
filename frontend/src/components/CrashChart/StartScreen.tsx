/**
 * Pre-round screen: sunburst backdrop, centred brand lockup, and a bar that
 * drains across the wait window. `progress` runs 1 → 0 and comes from the
 * same clock that starts the round, so the bar empties exactly at takeoff.
 */
export interface StartScreenProps {
  /** 1 = full bar, 0 = empty. */
  progress: number;
  /** Total countdown length, seconds — shown as the remaining readout. */
  totalSeconds: number;
  title?: string;
  subtitle?: string;
}

export function StartScreen({
  progress,
  totalSeconds,
  title = 'AVIATOR',
  subtitle = 'WAITING FOR NEXT ROUND',
}: StartScreenProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const remaining = Math.max(0, clamped * totalSeconds);

  return (
    <div className="cc-start" aria-live="polite">
      <div className="cc-start-rays" aria-hidden="true" />

      <div className="cc-start-inner">
        <div className="cc-start-lockup">
          <svg className="cc-start-mark" viewBox="0 0 64 32" aria-hidden="true">
            {/* Simple stylised plane, drawn rather than imported so it
                inherits the accent colour and needs no asset. */}
            <path d="M2 24 L26 18 L14 4 L22 3 L42 15 L60 12 L62 17 L44 21 L30 30 L24 29 L30 22 Z" />
          </svg>
          <span className="cc-start-title">{title}</span>
        </div>

        <div className="cc-start-sub">{subtitle}</div>

        <div
          className="cc-start-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(clamped * 100)}
          aria-label="Time until next round"
        >
          <div className="cc-start-bar-fill" style={{ width: `${clamped * 100}%` }} />
        </div>

        <div className="cc-start-count">{remaining.toFixed(1)}s</div>
      </div>
    </div>
  );
}
