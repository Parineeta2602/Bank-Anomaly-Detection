import React from 'react';

export default function ModelAgreementChart({ agreementData, prevalence }) {
  if (!agreementData || agreementData.length === 0) {
    return <div style={{ color: 'var(--text-muted)' }}>No model agreement data available.</div>;
  }

  const groupColors = {
    'neither': '#94a3b8',
    'IF only': '#2563eb',
    'SVM only': '#f59e0b',
    'both models': '#059669',
  };

  const maxRate = Math.max(...agreementData.map((d) => d.fraud_rate_pct || 0), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {agreementData.map((item) => {
        const color = groupColors[item.group] || '#475569';
        const pctWidth = Math.min(100, (item.fraud_rate_pct / maxRate) * 100);

        return (
          <div key={item.group} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                {item.group === 'both models' ? '🌟 Dual Model Consensus' : item.group}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color }}>
                {item.fraud_rate_pct?.toFixed(2)}% fraud rate ({item.frauds} fraud / {item.transactions?.toLocaleString()} txns)
              </span>
            </div>
            <div style={{ background: '#e2e8f0', borderRadius: '4px', height: '12px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.max(2, pctWidth)}%`,
                  height: '100%',
                  background: color,
                  borderRadius: '4px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        );
      })}

      {prevalence !== undefined && (
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.4rem' }}>
          Overall Dataset Fraud Prevalence: <b>{((prevalence || 0) * 100).toFixed(4)}%</b>
        </div>
      )}
    </div>
  );
}
