import React from 'react';

export default function ScoreAttributionBar({ attribution }) {
  if (!attribution) return null;

  const {
    severity = { points: 0, max: 50 },
    behaviour = { points: 0, max: 25 },
    agreement = { points: 0, max: 15 },
    urgency = { points: 0, max: 10 },
    total_priority = 0,
  } = attribution;

  const items = [
    { label: 'Severity (50%)', pts: severity.points, max: 50, color: '#1e40af' },
    { label: 'Behaviour (25%)', pts: behaviour.points, max: 25, color: '#0284c7' },
    { label: 'Agreement (15%)', pts: agreement.points, max: 15, color: '#f59e0b' },
    { label: 'Urgency (10%)', pts: urgency.points, max: 10, color: '#dc2626' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)' }}>
          Priority Score Attribution
        </div>
        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-navy-bold)', fontFamily: 'var(--font-mono)' }}>
          {total_priority.toFixed(1)} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ 100</span>
        </div>
      </div>

      {/* Progress Bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        {items.map((it) => {
          const pct = Math.min(100, (it.pts / it.max) * 100);
          return (
            <div key={it.label} style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                <span>{it.label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  {it.pts.toFixed(1)} / {it.max} pts
                </span>
              </div>
              <div style={{ background: '#f1f5f9', borderRadius: '3px', height: '8px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: it.color,
                    borderRadius: '3px',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
