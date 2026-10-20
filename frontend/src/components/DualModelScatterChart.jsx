import React, { useState } from 'react';

export default function DualModelScatterChart({ scatterPoints, thresholds, onSelectRow }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!scatterPoints || scatterPoints.length === 0) {
    return <div style={{ color: 'var(--text-muted)', padding: '1rem' }}>No scatter data available.</div>;
  }

  const ifCutoff = thresholds?.if_cutoff ?? 0.66355;
  const svmCutoff = thresholds?.svm_cutoff ?? 1.25120;

  // Determine bounds
  const ifScores = scatterPoints.map((p) => p.if_score);
  const svmScores = scatterPoints.map((p) => p.svm_score);

  const minIf = Math.min(...ifScores, ifCutoff - 0.1);
  const maxIf = Math.max(...ifScores, ifCutoff + 0.1);
  const minSvm = Math.min(...svmScores, svmCutoff - 0.5);
  const maxSvm = Math.max(...svmScores, svmCutoff + 0.5);

  const width = 560;
  const height = 320;
  const padding = { top: 25, right: 30, bottom: 45, left: 55 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const getX = (val) => padding.left + ((val - minIf) / (maxIf - minIf || 1)) * chartW;
  const getY = (val) => padding.top + chartH - ((val - minSvm) / (maxSvm - minSvm || 1)) * chartH;

  const ifCutoffX = getX(ifCutoff);
  const svmCutoffY = getY(svmCutoff);

  // Priority color interpolation (emerald -> amber -> crimson)
  const getPointColor = (point) => {
    if (point.is_fraud === 1) return '#dc2626';
    if (point.if_flag && point.svm_flag) return '#9333ea'; // Dual model
    if (point.flagged) return '#ea580c'; // Priority flagged
    if (point.priority >= 70) return '#f59e0b';
    return '#3b82f6';
  };

  return (
    <div style={{ position: 'relative' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        {/* Dual consensus quadrant background (top right) */}
        {ifCutoffX < padding.left + chartW && svmCutoffY > padding.top && (
          <rect
            x={ifCutoffX}
            y={padding.top}
            width={padding.left + chartW - ifCutoffX}
            height={svmCutoffY - padding.top}
            fill="#eff6ff"
            opacity={0.6}
          />
        )}

        {/* Quadrant label */}
        <text
          x={padding.left + chartW - 8}
          y={padding.top + 18}
          textAnchor="end"
          fontSize="9"
          fill="#1e40af"
          fontWeight="700"
        >
          DUAL-MODEL CONSENSUS ZONE &rarr;
        </text>

        {/* Axes */}
        <line
          x1={padding.left}
          y1={padding.top + chartH}
          x2={padding.left + chartW}
          y2={padding.top + chartH}
          stroke="#cbd5e1"
          strokeWidth={1}
        />
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + chartH}
          stroke="#cbd5e1"
          strokeWidth={1}
        />

        {/* Threshold lines */}
        {ifCutoffX >= padding.left && ifCutoffX <= padding.left + chartW && (
          <g>
            <line
              x1={ifCutoffX}
              y1={padding.top}
              x2={ifCutoffX}
              y2={padding.top + chartH}
              stroke="#0f172a"
              strokeDasharray="3,3"
              strokeWidth={1.5}
            />
            <text x={ifCutoffX} y={padding.top - 7} fill="#0f172a" fontSize="9" fontWeight="700" textAnchor="middle">
              IF Cutoff ({ifCutoff.toFixed(3)})
            </text>
          </g>
        )}

        {svmCutoffY >= padding.top && svmCutoffY <= padding.top + chartH && (
          <g>
            <line
              x1={padding.left}
              y1={svmCutoffY}
              x2={padding.left + chartW}
              y2={svmCutoffY}
              stroke="#0f172a"
              strokeDasharray="3,3"
              strokeWidth={1.5}
            />
            <text x={padding.left + chartW + 5} y={svmCutoffY + 3} fill="#0f172a" fontSize="9" fontWeight="700">
              SVM ({svmCutoff.toFixed(2)})
            </text>
          </g>
        )}

        {/* Scatter Points */}
        {scatterPoints.map((p, idx) => {
          const cx = getX(p.if_score);
          const cy = getY(p.svm_score);
          const isSelected = hoveredPoint?.row_id === p.row_id;
          const radius = p.flagged || p.is_fraud ? 4.5 : 2.5;

          return (
            <circle
              key={idx}
              cx={cx}
              cy={cy}
              r={isSelected ? radius + 3 : radius}
              fill={getPointColor(p)}
              stroke={isSelected ? '#0f172a' : '#ffffff'}
              strokeWidth={isSelected ? 1.5 : 0.6}
              opacity={p.flagged ? 0.9 : 0.65}
              style={{ cursor: 'pointer', transition: 'r 0.1s ease' }}
              onMouseEnter={() => setHoveredPoint(p)}
              onMouseLeave={() => setHoveredPoint(null)}
              onClick={() => onSelectRow && onSelectRow(p.row_id)}
            />
          );
        })}

        {/* Axes labels */}
        <text
          x={padding.left + chartW / 2}
          y={height - 10}
          fill="#475569"
          fontSize="11"
          fontWeight="600"
          textAnchor="middle"
        >
          Isolation Forest Score &rarr;
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
          One-Class SVM Score &rarr;
        </text>
      </svg>

      {/* Point details floating tooltip */}
      {hoveredPoint && (
        <div style={{
          position: 'absolute',
          top: '15px',
          left: '70px',
          background: 'rgba(15, 23, 42, 0.95)',
          color: '#ffffff',
          padding: '6px 12px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.75rem',
          boxShadow: 'var(--shadow-md)',
          pointerEvents: 'none',
          zIndex: 10,
        }}>
          <div><b>Row #{hoveredPoint.row_id}</b> &bull; {hoveredPoint.type} &bull; ${hoveredPoint.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div>IF Score: <b>{hoveredPoint.if_score}</b> | SVM Score: <b>{hoveredPoint.svm_score}</b></div>
          <div>Priority: <b style={{ color: '#38bdf8' }}>{hoveredPoint.priority} / 100</b> {hoveredPoint.flagged ? '🚨 FLAGGED' : ''}</div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: 8, height: 8, background: '#3b82f6', borderRadius: '50%' }}></span> Normal
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: 8, height: 8, background: '#ea580c', borderRadius: '50%' }}></span> Priority Flagged
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: 8, height: 8, background: '#9333ea', borderRadius: '50%' }}></span> Both Models Flagged
        </span>
      </div>
    </div>
  );
}
