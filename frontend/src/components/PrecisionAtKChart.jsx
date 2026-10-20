import React, { useState } from 'react';

export default function PrecisionAtKChart({ curves, prevalence, nTotal }) {
  const [hoveredK, setHoveredK] = useState(null);

  if (!curves || Object.keys(curves).length === 0) {
    return <div style={{ color: 'var(--text-muted)', padding: '1rem' }}>No evaluation curve data available.</div>;
  }

  const width = 560;
  const height = 300;
  const padding = { top: 25, right: 25, bottom: 45, left: 55 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const methodColors = {
    'Baseline: biggest amount': '#8c8c8c',
    'Isolation Forest': '#2563eb',
    'One-Class SVM': '#f59e0b',
    'Combined priority score': '#059669',
  };

  // Find min and max K on log scale
  const allPoints = Object.values(curves).flat();
  const ks = allPoints.map((p) => p.k);
  const minK = Math.max(1, Math.min(...ks));
  const maxK = Math.max(...ks, 100);

  const logMinK = Math.log10(minK);
  const logMaxK = Math.log10(maxK);

  const getX = (k) => {
    const logK = Math.log10(Math.max(k, 1));
    return padding.left + ((logK - logMinK) / (logMaxK - logMinK || 1)) * chartW;
  };

  const getY = (prec) => {
    const clamped = Math.max(0, Math.min(1.0, prec));
    return padding.top + chartH - clamped * chartH;
  };

  const prevalenceY = getY(prevalence || 0.001);

  // Build SVG path string for each curve
  const makePath = (points) => {
    if (!points || points.length === 0) return '';
    return points
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(pt.k).toFixed(1)} ${getY(pt.precision).toFixed(1)}`)
      .join(' ');
  };

  return (
    <div style={{ position: 'relative' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1.0].map((v) => {
          const y = getY(v);
          return (
            <g key={v}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + chartW}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="2,2"
              />
              <text x={padding.left - 8} y={y + 3} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="var(--font-mono)">
                {(v * 100).toFixed(0)}%
              </text>
            </g>
          );
        })}

        {/* Random Guessing Baseline Line */}
        <line
          x1={padding.left}
          y1={prevalenceY}
          x2={padding.left + chartW}
          y2={prevalenceY}
          stroke="#475569"
          strokeWidth={1.5}
          strokeDasharray="4,4"
        />
        <text
          x={padding.left + chartW - 5}
          y={prevalenceY - 5}
          fill="#475569"
          fontSize="9"
          fontWeight="600"
          textAnchor="end"
        >
          Random Guessing ({((prevalence || 0) * 100).toFixed(3)}%)
        </text>

        {/* Curves */}
        {Object.entries(curves).map(([name, points]) => {
          const color = methodColors[name] || '#6366f1';
          return (
            <g key={name}>
              <path
                d={makePath(points)}
                fill="none"
                stroke={color}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {points.map((pt, i) => (
                <circle
                  key={i}
                  cx={getX(pt.k)}
                  cy={getY(pt.precision)}
                  r={hoveredK === pt.k ? 5 : 2.5}
                  fill={color}
                  stroke="#ffffff"
                  strokeWidth={1}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredK(pt.k)}
                  onMouseLeave={() => setHoveredK(null)}
                />
              ))}
            </g>
          );
        })}

        {/* X Axis & labels */}
        <line
          x1={padding.left}
          y1={padding.top + chartH}
          x2={padding.left + chartW}
          y2={padding.top + chartH}
          stroke="#cbd5e1"
        />
        {[10, 50, 100, 500, 1000, 5000, 20000].filter((k) => k >= minK && k <= maxK).map((k) => (
          <text
            key={k}
            x={getX(k)}
            y={padding.top + chartH + 18}
            fill="#64748b"
            fontSize="9"
            fontFamily="var(--font-mono)"
            textAnchor="middle"
          >
            {k >= 1000 ? `${k / 1000}k` : k}
          </text>
        ))}

        <text
          x={padding.left + chartW / 2}
          y={height - 8}
          fill="#475569"
          fontSize="11"
          fontWeight="600"
          textAnchor="middle"
        >
          K = Top-Ranked Transactions Inspected (log scale) &rarr;
        </text>
        <text
          x={14}
          y={padding.top + chartH / 2}
          fill="#475569"
          fontSize="11"
          fontWeight="600"
          transform={`rotate(-90 14 ${padding.top + chartH / 2})`}
          textAnchor="middle"
        >
          Precision@K &rarr;
        </text>
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem', fontSize: '0.75rem' }}>
        {Object.entries(methodColors).map(([name, color]) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: 14, height: 3, background: color, borderRadius: 2 }}></span>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
