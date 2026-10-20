import React, { useState } from 'react';

export default function ScoreDistributionChart({ distributions }) {
  const [tooltip, setTooltip] = useState(null);

  if (!distributions || Object.keys(distributions).length === 0) {
    return <div style={{ color: 'var(--text-muted)', padding: '1rem' }}>No distribution data available.</div>;
  }

  const panels = [
    { key: 'if_score', title: 'Isolation Forest Score', color: '#1e40af', cutoffLabel: 'IF Cutoff' },
    { key: 'svm_score', title: 'One-Class SVM Score', color: '#f59e0b', cutoffLabel: 'SVM Cutoff' },
    { key: 'priority', title: 'Priority Score (0-100)', color: '#059669', cutoffLabel: 'Priority Cutoff' },
  ];

  const renderPanel = (panel) => {
    const data = distributions[panel.key];
    if (!data || !data.bin_centers || data.bin_centers.length === 0) return null;

    const binCenters = data.bin_centers;
    const normalCounts = data.normal_counts || [];
    const fraudCounts = data.fraud_counts || [];
    const threshold = data.threshold;
    const minVal = data.min;
    const maxVal = data.max;

    const width = 360;
    const height = 180;
    const padding = { top: 20, right: 15, bottom: 30, left: 45 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Use log scale or linear scale
    const maxCount = Math.max(
      ...normalCounts,
      ...fraudCounts,
      1
    );

    // Map X coordinate
    const getX = (val) => {
      const span = maxVal - minVal || 1;
      return padding.left + ((val - minVal) / span) * chartW;
    };

    // Map Y coordinate (log-friendly scaling so low counts are visible)
    const getY = (count) => {
      if (count <= 0) return padding.top + chartH;
      // Log10 scale
      const logMax = Math.log10(maxCount + 1);
      const logVal = Math.log10(count + 1);
      const ratio = logVal / logMax;
      return padding.top + chartH - ratio * chartH;
    };

    const thrX = getX(threshold);
    const barWidth = Math.max(2, (chartW / binCenters.length) - 1.5);

    return (
      <div key={panel.key} style={{ background: '#f8fafc', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '0.75rem', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {panel.title}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            Threshold: <b>{threshold.toFixed(4)}</b>
          </div>
        </div>

        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1].map((r, i) => {
            const y = padding.top + chartH - r * chartH;
            return (
              <line
                key={i}
                x1={padding.left}
                y1={y}
                x2={padding.left + chartW}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="2,2"
              />
            );
          })}

          {/* Normal bars */}
          {binCenters.map((bin, i) => {
            const count = normalCounts[i] || 0;
            const x = getX(bin) - barWidth / 2;
            const y = getY(count);
            const h = padding.top + chartH - y;
            return (
              <rect
                key={`norm-${i}`}
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(0, h)}
                fill={panel.color}
                opacity={0.7}
                rx={1}
                onMouseEnter={() => setTooltip({
                  x: getX(bin),
                  y,
                  text: `Bin: ${bin.toFixed(3)} | Normal: ${count.toLocaleString()}`
                })}
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })}

          {/* Fraud bars (if present) */}
          {fraudCounts.length > 0 && binCenters.map((bin, i) => {
            const count = fraudCounts[i] || 0;
            if (count === 0) return null;
            const x = getX(bin) - barWidth / 2;
            const y = getY(count);
            const h = padding.top + chartH - y;
            return (
              <rect
                key={`fraud-${i}`}
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(0, h)}
                fill="#dc2626"
                opacity={0.9}
                rx={1}
                onMouseEnter={() => setTooltip({
                  x: getX(bin),
                  y,
                  text: `Bin: ${bin.toFixed(3)} | Fraud: ${count.toLocaleString()}`
                })}
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })}

          {/* Calibrated Threshold Cutoff line */}
          {thrX >= padding.left && thrX <= padding.left + chartW && (
            <g>
              <line
                x1={thrX}
                y1={padding.top}
                x2={thrX}
                y2={padding.top + chartH}
                stroke="#0f172a"
                strokeWidth={2}
                strokeDasharray="3,3"
              />
              <text
                x={thrX}
                y={padding.top - 5}
                fill="#0f172a"
                fontSize="9"
                fontWeight="700"
                textAnchor="middle"
              >
                Cutoff ({threshold > 10 ? threshold.toFixed(1) : threshold.toFixed(3)})
              </text>
            </g>
          )}

          {/* Axes labels */}
          <line
            x1={padding.left}
            y1={padding.top + chartH}
            x2={padding.left + chartW}
            y2={padding.top + chartH}
            stroke="#cbd5e1"
            strokeWidth={1}
          />
          <text x={padding.left} y={height - 8} fill="#64748b" fontSize="10" fontFamily="var(--font-mono)">
            {minVal.toFixed(2)}
          </text>
          <text x={padding.left + chartW} y={height - 8} fill="#64748b" fontSize="10" textAnchor="end" fontFamily="var(--font-mono)">
            {maxVal.toFixed(2)}
          </text>
          <text x={12} y={padding.top + chartH / 2} fill="#64748b" fontSize="9" transform={`rotate(-90 12 ${padding.top + chartH / 2})`} textAnchor="middle">
            Count (log)
          </text>
        </svg>

        {tooltip && (
          <div style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            background: 'rgba(15, 23, 42, 0.9)',
            color: '#fff',
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '0.72rem',
            pointerEvents: 'none',
          }}>
            {tooltip.text}
          </div>
        )}
      </div>
    );
  };

  const hasFraudCounts = distributions.if_score?.fraud_counts?.length > 0;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Dashed vertical lines mark the calibrated 0.20% alert budget thresholds from the training calibration set.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: 10, height: 10, background: '#1e40af', borderRadius: 2 }}></span>
            Normal Transactions
          </span>
          {hasFraudCounts && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: 10, height: 10, background: '#dc2626', borderRadius: 2 }}></span>
              Verified Fraud (Ground Truth)
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {panels.map((p) => renderPanel(p))}
      </div>
    </div>
  );
}
