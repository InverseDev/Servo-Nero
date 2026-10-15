import { useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';

const WIDTH = 720;
const HEIGHT = 220;
const LEFT = 38;
const RIGHT = 704;
const TOP = 12;
const BOTTOM = 190;

export default function LevelChart({ history, currentLevel }) {
  const [selectedPoint, setSelectedPoint] = useState(null);

  const points = useMemo(() => {
    const values = [...history];
    if (values.length) values[values.length - 1] = currentLevel;
    const usable = values.length ? values : [currentLevel];
    return usable.map((level, index) => {
      const x = LEFT + (index / Math.max(usable.length - 1, 1)) * (RIGHT - LEFT);
      const y = BOTTOM - (Math.max(0, Math.min(100, level)) / 100) * (BOTTOM - TOP);
      return { x, y, level, index };
    });
  }, [history, currentLevel]);

  const linePath = points.map((point, index) =>
    `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
  ).join(' ');
  const areaPath = `${linePath} L ${RIGHT} ${BOTTOM} L ${LEFT} ${BOTTOM} Z`;
  const chosenPoint = selectedPoint == null ? points[points.length - 1] : points[selectedPoint];

  return (
    <section className="card chart-card">
      <div className="section-heading chart-heading">
        <div className="section-icon chart-icon"><TrendingUp size={17} /></div>
        <div>
          <h2>Water usage</h2>
          <p>Water level over the last 24 hours</p>
        </div>
        <div className="chart-current">
          <span className="chart-current-dot" />
          <strong>{Math.round(currentLevel)}%</strong>
        </div>
      </div>

      <div className="chart-wrap">
        <div className="chart-y-labels" aria-hidden="true">
          <span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span>
        </div>
        <svg
          className="level-chart"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Line graph showing water level changes over the last 24 hours"
          onMouseLeave={() => setSelectedPoint(null)}
        >
          <defs>
            <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#31c9ed" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#31c9ed" stopOpacity="0.015" />
            </linearGradient>
          </defs>
          {[0, 25, 50, 75, 100].map((value) => {
            const y = BOTTOM - (value / 100) * (BOTTOM - TOP);
            return <line key={value} x1={LEFT} x2={RIGHT} y1={y} y2={y} className="chart-gridline" />;
          })}
          {[0, 6, 12, 18, 24].map((value) => {
            const x = LEFT + (value / 24) * (RIGHT - LEFT);
            return <line key={value} x1={x} x2={x} y1={TOP} y2={BOTTOM} className="chart-gridline chart-gridline-vertical" />;
          })}
          <path d={areaPath} fill="url(#chartFill)" />
          <path d={linePath} className="chart-line" />
          {points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={index === points.length - 1 ? 5 : 2.1}
              className={index === points.length - 1 ? 'chart-point chart-point-current' : 'chart-point'}
              onMouseEnter={() => setSelectedPoint(index)}
              onFocus={() => setSelectedPoint(index)}
              tabIndex={0}
              role="button"
              aria-label={`Reading ${index + 1}: ${Math.round(point.level)} percent`}
            />
          ))}
          {chosenPoint && selectedPoint != null && (
            <g className="chart-tooltip">
              <rect x={Math.min(Math.max(chosenPoint.x - 39, LEFT), RIGHT - 78)} y={Math.max(TOP, chosenPoint.y - 34)} width="78" height="25" rx="7" />
              <text x={Math.min(Math.max(chosenPoint.x, LEFT + 39), RIGHT - 39)} y={Math.max(TOP + 16, chosenPoint.y - 17)} textAnchor="middle">{Math.round(chosenPoint.level)}% full</text>
            </g>
          )}
        </svg>
      </div>
      <div className="chart-x-labels" aria-hidden="true">
        <span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>Now</span>
      </div>
      <div className="chart-footnote"><span className="chart-legend-line" /> Sample history · updated during preview</div>
    </section>
  );
}
