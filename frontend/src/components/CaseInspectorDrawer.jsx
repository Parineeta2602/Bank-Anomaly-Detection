import React, { useEffect, useState } from 'react';
import { X, ArrowRight, ShieldAlert, CheckCircle2, AlertTriangle, AlertCircle, TrendingUp, Info } from 'lucide-react';
import ScoreAttributionBar from './ScoreAttributionBar';

export default function CaseInspectorDrawer({ rowId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (rowId === null || rowId === undefined) return;
    setLoading(true);
    fetch(`/api/investigation/transaction/${rowId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Transaction details not found');
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [rowId]);

  if (rowId === null || rowId === undefined) return null;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="badge badge-primary" style={{ fontFamily: 'var(--font-mono)' }}>
                Row #{rowId}
              </span>
              {data && (
                <span className={`badge ${data.flagged ? 'badge-danger' : 'badge-neutral'}`}>
                  {data.flagged ? '🚨 Flagged for Audit' : 'Normal Range'}
                </span>
              )}
              {data && data.isFraud === 1 && (
                <span className="badge badge-danger">
                  Verified Fraud Ground Truth
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '1.15rem', marginTop: '0.25rem', color: 'var(--text-navy-bold)' }}>
              Transaction Triage Inspector
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '4px',
              borderRadius: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <div className="spinner" style={{ margin: '0 auto 0.75rem auto', borderTopColor: 'var(--primary)' }}></div>
              Loading transaction audit data...
            </div>
          )}

          {error && (
            <div className="alert-banner warning">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {data && (
            <>
              {/* Compliance & Audit Explanation */}
              <div style={{
                background: 'var(--bg-accent-subtle)',
                border: '1px solid var(--bg-accent-badge)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
              }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                  Plain-English Audit Explanation
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-main)', fontStyle: 'italic', lineHeight: 1.45 }}>
                  "{data.explanation}"
                </div>
              </div>

              {/* Transaction Key Data Strip */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.75rem',
                background: '#f8fafc',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem',
              }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Type</div>
                  <div style={{ fontWeight: 800, color: 'var(--text-navy-bold)', fontSize: '0.95rem' }}>{data.type}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Amount</div>
                  <div style={{ fontWeight: 800, color: 'var(--text-navy-bold)', fontSize: '0.95rem', fontFamily: 'var(--font-mono)' }}>
                    ${data.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Time Step</div>
                  <div style={{ fontWeight: 800, color: 'var(--text-navy-bold)', fontSize: '0.95rem', fontFamily: 'var(--font-mono)' }}>
                    Hour {data.step}
                  </div>
                </div>
              </div>

              {/* Score Attribution Breakdown */}
              <div style={{
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                background: '#ffffff',
              }}>
                <ScoreAttributionBar attribution={data.score_attribution} />
              </div>

              {/* Account Balance Transitions */}
              <div style={{
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                background: '#ffffff',
              }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                  Account Balances &amp; Flow
                </div>

                {/* Sender Flow */}
                <div style={{ marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                    <span><b>Sender:</b> <code style={{ color: 'var(--primary)' }}>{data.nameOrig}</code></span>
                    {data.behavioral_indicators?.sender_emptied && (
                      <span className="badge badge-danger">Account Emptied to $0</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f8fafc', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                      ${data.oldbalanceOrg?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <ArrowRight size={14} color="#64748b" />
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700 }}>
                      ${data.newbalanceOrig?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Recipient Flow */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                    <span><b>Recipient:</b> <code style={{ color: 'var(--primary)' }}>{data.nameDest}</code></span>
                    {data.behavioral_indicators?.recipient_empty_before && (
                      <span className="badge badge-warning">Zero Balance Before</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f8fafc', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                      ${data.oldbalanceDest?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <ArrowRight size={14} color="#64748b" />
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700 }}>
                      ${data.newbalanceDest?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Model Flags Audit Strip */}
              <div style={{
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                background: '#f8fafc',
              }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                  Model Decision Evidence
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem', fontSize: '0.75rem' }}>
                  <div style={{ background: '#ffffff', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
                    <div style={{ color: 'var(--text-muted)' }}>Isolation Forest</div>
                    <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>Score: {data.if_score}</div>
                    <div style={{ marginTop: '2px' }}>
                      <span className={`badge ${data.if_flag ? 'badge-danger' : 'badge-neutral'}`}>
                        {data.if_flag ? 'Outlier Flagged' : 'Normal'}
                      </span>
                    </div>
                  </div>

                  <div style={{ background: '#ffffff', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
                    <div style={{ color: 'var(--text-muted)' }}>One-Class SVM</div>
                    <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>Score: {data.svm_score}</div>
                    <div style={{ marginTop: '2px' }}>
                      <span className={`badge ${data.svm_flag ? 'badge-danger' : 'badge-neutral'}`}>
                        {data.svm_flag ? 'Outlier Flagged' : 'Normal'}
                      </span>
                    </div>
                  </div>

                  <div style={{ background: '#ffffff', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
                    <div style={{ color: 'var(--text-muted)' }}>Amount Baseline</div>
                    <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>&ge; $2.87M</div>
                    <div style={{ marginTop: '2px' }}>
                      <span className={`badge ${data.amount_baseline_flag ? 'badge-warning' : 'badge-neutral'}`}>
                        {data.amount_baseline_flag ? 'Exceeds Cutoff' : 'Below'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
