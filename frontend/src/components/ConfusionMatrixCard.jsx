import React from 'react';

export default function ConfusionMatrixCard({ matrices }) {
  if (!matrices || Object.keys(matrices).length === 0) {
    return <div style={{ color: 'var(--text-muted)' }}>No confusion matrices available.</div>;
  }

  const methods = [
    { key: 'Baseline: biggest amount', label: 'Amount Baseline' },
    { key: 'Isolation Forest', label: 'Isolation Forest' },
    { key: 'One-Class SVM', label: 'One-Class SVM' },
    { key: 'Combined priority score', label: 'Combined Priority' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1rem' }}>
      {methods.map(({ key, label }) => {
        const cm = matrices[key];
        if (!cm) return null;

        const { TN = 0, FP = 0, FN = 0, TP = 0 } = cm;
        const total = TN + FP + FN + TP || 1;
        const precision = TP / Math.max(TP + FP, 1);
        const recall = TP / Math.max(TP + FN, 1);

        return (
          <div
            key={key}
            style={{
              background: '#f8fafc',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              {label}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '0.65rem' }}>
              {/* TN */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: '#166534', fontWeight: 600 }}>TN (Normal &amp; OK)</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#15803d', fontFamily: 'var(--font-mono)' }}>
                  {TN.toLocaleString()}
                </div>
              </div>

              {/* FP */}
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: '#92400e', fontWeight: 600 }}>FP (False Alarm)</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#b45309', fontFamily: 'var(--font-mono)' }}>
                  {FP.toLocaleString()}
                </div>
              </div>

              {/* FN */}
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: '#991b1b', fontWeight: 600 }}>FN (Missed Fraud)</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#b91c1c', fontFamily: 'var(--font-mono)' }}>
                  {FN.toLocaleString()}
                </div>
              </div>

              {/* TP */}
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: '#1e40af', fontWeight: 600 }}>TP (Detected Fraud)</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1d4ed8', fontFamily: 'var(--font-mono)' }}>
                  {TP.toLocaleString()}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              <span>Precision: <b>{(precision * 100).toFixed(1)}%</b></span>
              <span>Recall: <b>{(recall * 100).toFixed(1)}%</b></span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
