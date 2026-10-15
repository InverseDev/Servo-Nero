import { Droplets } from 'lucide-react';

export default function WaterTank({ level }) {
  const safeLevel = Math.max(0, Math.min(100, level));

  return (
    <div className="tank-visual-wrap" aria-label={`Tank is ${Math.round(safeLevel)} percent full`}>
      <div className="tank-cap" />
      <div className="tank-shell">
        <div className="tank-ticks" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="tank-water" style={{ height: `${safeLevel}%` }}>
          <svg className="tank-wave tank-wave-back" viewBox="0 0 180 22" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 11 C15 1 30 1 45 11 S75 21 90 11 S120 1 135 11 S165 21 180 11 V22 H0 Z" />
          </svg>
          <svg className="tank-wave tank-wave-front" viewBox="0 0 180 22" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 11 C15 21 30 21 45 11 S75 1 90 11 S120 21 135 11 S165 1 180 11 V22 H0 Z" />
          </svg>
          <div className="water-shimmer" />
        </div>
        {safeLevel < 18 && <div className="tank-low-line" />}
      </div>
      <div className="tank-base" />
      <div className="tank-level-chip">
        <Droplets size={12} strokeWidth={2.2} />
        {Math.round(safeLevel)}%
      </div>
    </div>
  );
}
