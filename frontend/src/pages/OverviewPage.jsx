import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Cpu,
  Layers,
  Database,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  FileText,
  BarChart3,
  Award,
} from 'lucide-react';
import KpiCard from '../components/KpiCard';

export default function OverviewPage({ systemStatus, setActivePage, onLoadSample }) {
  const [benchmarkData, setBenchmarkData] = useState(null);
  const [loadingBenchmark, setLoadingBenchmark] = useState(false);

  useEffect(() => {
    setLoadingBenchmark(true);
    fetch('/api/evaluation/benchmark')
      .then((res) => res.json())
      .then((json) => {
        setBenchmarkData(json);
        setLoadingBenchmark(false);
      })
      .catch(() => setLoadingBenchmark(false));
  }, []);

  const activeDataset = systemStatus?.active_dataset || {};
  const thresholds = systemStatus?.thresholds || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%)',
        color: '#ffffff',
        padding: '1.5rem 1.75rem',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div style={{ maxWidth: '750px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255, 255, 255, 0.15)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            <span>Operational Anti-Money Laundering &amp; Surveillance Suite</span>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.25 }}>
            Enterprise Bank Transaction Anomaly Detection
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#e0e7ff', marginTop: '0.4rem', lineHeight: 1.5 }}>
            Directly executes trained <b>Isolation Forest</b> and <b>One-Class SVM</b> models alongside empirical percentile ranking.
            Calibrated to a strict <b>0.20% alert budget</b> to focus compliance teams on the highest-risk investigations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setActivePage('upload')}
            style={{ background: '#ffffff', color: '#1e3a8a', fontWeight: 700 }}
          >
            Go to Upload &amp; Analyze &rarr;
          </button>
        </div>
      </div>

      {/* Top KPI Metrics Row */}
      <div className="kpi-grid">
        <KpiCard
          label="Active Dataset"
          value={activeDataset.row_count > 0 ? activeDataset.row_count.toLocaleString() : 'None'}
          subtext={activeDataset.name !== 'None loaded' ? activeDataset.name : 'Upload or load sample'}
          icon={<Database size={16} />}
          badge={activeDataset.has_scored ? 'Scored' : 'Pending'}
          badgeType={activeDataset.has_scored ? 'success' : 'neutral'}
        />
        <KpiCard
          label="Isolation Forest Cutoff"
          value={thresholds.if_cutoff?.toFixed(4) || '0.6635'}
          subtext="200 Isolation Trees"
          icon={<Cpu size={16} />}
          badge="Calibrated"
          badgeType="primary"
        />
        <KpiCard
          label="One-Class SVM Cutoff"
          value={thresholds.svm_cutoff?.toFixed(4) || '1.2512'}
          subtext="RBF Decision Boundary"
          icon={<Sliders size={16} />}
          badge="Calibrated"
          badgeType="primary"
        />
        <KpiCard
          label="Priority Triage Cutoff"
          value={thresholds.priority_cutoff?.toFixed(2) || '82.69'}
          subtext={`Alert Budget: ${(thresholds.alert_rate * 100 || 0.20).toFixed(2)}%`}
          icon={<Layers size={16} />}
          badge="0-100 Score"
          badgeType="warning"
        />
      </div>

      {/* 2-Column Overview Section */}
      <div className="grid-2">
        {/* Model Engine & Architecture Health */}
        <div className="dashboard-card" style={{ marginBottom: 0 }}>
          <div className="card-title-row">
            <div>
              <div className="card-title">
                <Cpu size={18} color="var(--primary)" />
                <span>Engine &amp; Artifact Integrity</span>
              </div>
              <div className="card-caption">Status of saved machine learning models &amp; calibration files</div>
            </div>
            <span className="badge badge-success">
              <CheckCircle2 size={12} />
              {systemStatus?.models_ready ? '100% Operational' : 'Offline'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.85rem', background: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>Isolation Forest (200 trees)</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>artifacts/isolation_forest.joblib</div>
              </div>
              <span className="badge badge-success">Loaded</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.85rem', background: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>One-Class SVM (RBF kernel)</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>artifacts/one_class_svm.joblib</div>
              </div>
              <span className="badge badge-success">Loaded</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.85rem', background: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>StandardScaler (16 features)</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>artifacts/scaler.joblib &bull; Clipped [-10, 10]</div>
              </div>
              <span className="badge badge-success">Loaded</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.85rem', background: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>Priority Calibration &amp; Percentile References</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>artifacts/priority_settings.joblib</div>
              </div>
              <span className="badge badge-success">Loaded</span>
            </div>
          </div>

          {/* 4 Priority Score Weights */}
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.65rem' }}>
              Operational Priority Score Composition
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '8px 4px', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.7rem', color: '#1e40af', fontWeight: 600 }}>Severity</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e3a8a', fontFamily: 'var(--font-mono)' }}>50%</div>
              </div>
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', padding: '8px 4px', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: 600 }}>Behaviour</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0284c7', fontFamily: 'var(--font-mono)' }}>25%</div>
              </div>
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '8px 4px', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 600 }}>Agreement</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#d97706', fontFamily: 'var(--font-mono)' }}>15%</div>
              </div>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '8px 4px', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.7rem', color: '#b91c1c', fontWeight: 600 }}>Urgency</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#dc2626', fontFamily: 'var(--font-mono)' }}>10%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Start / Built-in Datasets */}
        <div className="dashboard-card" style={{ marginBottom: 0 }}>
          <div className="card-title-row">
            <div>
              <div className="card-title">
                <Database size={18} color="var(--primary)" />
                <span>Quick-Start Benchmark Datasets</span>
              </div>
              <div className="card-caption">Instantly test the end-to-end pipeline with verified PaySim batches</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ border: '1px solid var(--border-light)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>Sample Ingestion Batch</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  1,000 live production transactions &bull; Unlabeled &bull; Fast inference demonstration
                </div>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onLoadSample('sample')}
              >
                Load Sample
              </button>
            </div>

            <div style={{ border: '1px solid #bfdbfe', background: '#f0f9ff', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1e3a8a' }}>Labeled Evaluation Batch</div>
                <div style={{ fontSize: '0.75rem', color: '#0369a1' }}>
                  2,500 transactions containing 14 verified fraud cases &bull; Enables full Evaluation tab
                </div>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onLoadSample('labeled')}
              >
                Load Labeled
              </button>
            </div>

            <div style={{ border: '1px solid var(--border-light)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>Full PaySim Test Period</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  37,653 transactions &bull; Complete test period artifact &bull; Comprehensive audit validation
                </div>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onLoadSample('benchmark')}
              >
                Load Full Test Set
              </button>
            </div>
          </div>

          {/* Operational Principles Card */}
          <div style={{ marginTop: '1.25rem', background: '#f8fafc', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-navy-bold)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              Core Operational Governance Rules
            </div>
            <ul style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingLeft: '1.2rem', lineHeight: 1.45 }}>
              <li><b>Zero Model Modification:</b> Executes exact saved weights and thresholds without retraining.</li>
              <li><b>Strict Label Isolation:</b> <code>isFraud</code> is NEVER included in feature vectors or model inputs.</li>
              <li><b>Triage Ranking:</b> Priority Score is an internal operational triage rank, NOT a guilt probability.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Precomputed PaySim Test Benchmark Summary Table */}
      <div className="dashboard-card">
        <div className="card-title-row">
          <div>
            <div className="card-title">
              <Award size={18} color="var(--primary)" />
              <span>Full Test Period Benchmark Reference (37,653 Transactions, 14 Frauds)</span>
            </div>
            <div className="card-caption">
              Precomputed benchmark from the PaySim test period demonstrating the empirical performance of each approach at the 0.20% alert rate
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setActivePage('evaluate')}>
            Open Full Evaluation &rarr;
          </button>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Detection Method</th>
                <th>Alerts Flagged</th>
                <th>True Positives (TP)</th>
                <th>False Positives (FP)</th>
                <th>Precision</th>
                <th>Recall</th>
                <th>F1 Score</th>
                <th>False Positive Rate</th>
                <th>Average Precision</th>
              </tr>
            </thead>
            <tbody>
              {benchmarkData?.metrics_table?.map((row) => (
                <tr key={row.method} style={{ fontWeight: row.method === 'Combined priority score' ? 700 : 400 }}>
                  <td style={{ color: row.method === 'Combined priority score' ? 'var(--primary)' : 'inherit' }}>
                    {row.method === 'Combined priority score' ? '🌟 Combined Priority Score' : row.method}
                  </td>
                  <td>{row.flagged?.toLocaleString() ?? '—'}</td>
                  <td style={{ color: '#15803d', fontWeight: 700 }}>{row.TP ?? '—'}</td>
                  <td style={{ color: '#b45309' }}>{row.FP ?? '—'}</td>
                  <td>{row.precision !== null ? `${(row.precision * 100).toFixed(2)}%` : '—'}</td>
                  <td>{row.recall !== null ? `${(row.recall * 100).toFixed(2)}%` : '—'}</td>
                  <td>{row.F1 !== null ? `${(row.F1 * 100).toFixed(2)}%` : '—'}</td>
                  <td>{row.false_positive_rate !== null ? `${(row.false_positive_rate * 100).toFixed(4)}%` : '—'}</td>
                  <td>{row.average_precision !== null ? `${(row.average_precision * 100).toFixed(2)}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
