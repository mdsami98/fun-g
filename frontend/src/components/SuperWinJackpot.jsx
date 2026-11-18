import { useEffect, useState } from 'react';

export function SuperWinJackpot() {
  const [amount, setAmount] = useState(21252476.53);

  useEffect(() => {
    const interval = setInterval(() => {
      setAmount((prev) => prev + (Math.random() * 0.4 + 0.08));
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  // Format integer and fractional parts
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="super-win-jackpot-card">
      <div className="super-win-storm-bg" />
      <div className="super-win-glow-aura" />

      {/* 3D Metallic Header */}
      <div className="super-win-title-wrap">
        <h3 className="super-win-metallic-title">SUPER WIN</h3>
      </div>

      {/* Segmented Digital Counter */}
      <div className="super-win-counter-grid">
        {formatted.split('').map((char, idx) => {
          if (char === ',' || char === '.') {
            return (
              <span key={idx} className="jackpot-sep">
                {char}
              </span>
            );
          }
          return (
            <span key={idx} className="jackpot-digit-box">
              <span className="jackpot-digit">{char}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
