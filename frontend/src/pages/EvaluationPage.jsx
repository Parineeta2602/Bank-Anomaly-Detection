import React, { useState, useEffect } from 'react';
import {
  Award,
  AlertTriangle,
  Database,
  BarChart2,
  TrendingUp,
  CheckCircle2,
  Layers,
  HelpCircle,
  FileCheck,
} from 'lucide-react';
import KpiCard from '../components/KpiCard';
import ConfusionMatrixCard from '../components/ConfusionMatrixCard';
import ModelAgreementChart from '../components/ModelAgreementChart';

export default function EvaluationPage({ systemStatus, onLoadSample, setActivePage }) {
  const [evalData, setEvalData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [benchmarkData, setBenchmarkData] = useState(null);

  const fetchEval = () => {
    setLoading(true);
    fetch('/api/evaluation')
      .then((res) => res.json())
      .then((json) => {
        setEvalData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchEval();
    fetch('/api/evaluation/benchmark')
      .then((res) => res.json())
      .then((json) => setBenchmarkData(json))
      .catch(() => {});
  }, []);

  const hasLabels = evalData?.has_labels === true;
  const hasScored = evalData?.has_scored === true;

  // Case 1: Ground truth labels are NOT in active dataset
  if (!hasScored || !hasLabels) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Warning Banner */}
        <div className="alert-banner warning">
          <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Ground-Truth Evaluation Disabled</div>
            <div style={{ fontSize: '0.8125rem', marginTop: '0.2rem', lineHeight: 1.45 }}>
              The currently active dataset does not contain verified ground-truth fraud labels (<code>isFraud</code>).
              Metrics such as <b>Precision, Recall, F1 Score, False Positive Rate, and Precision@K</b> can strictly be computed only when verified ground-truth labels exist.
            </div>
          </div>
        </div>

        {/* Action card to load labeled test period */}
        <div className="dashboard-card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <Database size={40} color="var(--primary)" style={{ margin: '0 auto 0.75rem auto' }} />
          <h3 style={{ fontSize: '1.15rem', color: 'var(--text-navy-bold)' }}>Test the Evaluation Engine with Verified Labels</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '560px', margin: '0.5rem auto 1.5rem auto' }}>
            Load the verified PaySim test period containing real labeled fraud instances to dynamically evaluate Isolation Forest, One-Class SVM, and Priority Ranking.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={() => onLoadSample('labeled')}
            >
              🏷️ Load Labeled Sample (2,500 txns, 14 frauds)
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => onLoadSample('benchmark')}
            >
              🏆 Load Full Test Set (37,653 txns, 14 frauds)
            </button>
          </div>
        </div>

        {/* Display Precomputed Authoritative Benchmark */}
        {benchmarkData && (
          <div className="dashboard-card">
            <div className="card-title-row">
              <div>
                <div className="card-title">
                  <Award size={18} color="var(--primary)" />
                  <span>Precomputed PaySim Benchmark Reference (37,653 Rows, 14 Frauds)</span>
                </div>
                <div className="card-caption">
                  Saved test evaluation artifact from the model training process at the calibrated 0.20% alert rate
                </div>
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Detection Method</th>
                    <th>Flagged</th>
                    <th>TP</th>
                    <th>FP</th>
                    <th>FN</th>
                    <th>TN</th>
                    <th>Precision</th>
                    <th>Recall</th>
                    <th>F1 Score</th>
                    <th>False Positive Rate</th>
                    <th>Avg Precision</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmarkData.metrics_table?.map((row) => (
                    <tr key={row.method} style={{ fontWeight: row.method === 'Combined priority score' ? 700 : 400 }}>
                      <td style={{ color: row.method === 'Combined priority score' ? 'var(--primary)' : 'inherit' }}>
                        {row.method === 'Combined priority score' ? '🌟 Combined Priority Score' : row.method}
                      </td>
                      <td>{row.flagged?.toLocaleString() ?? '—'}</td>
                      <td style={{ color: '#15803d', fontWeight: 700 }}>{row.TP ?? '—'}</td>
                      <td style={{ color: '#b45309' }}>{row.FP ?? '—'}</td>
                      <td>{row.FN ?? '—'}</td>
                      <td>{row.TN?.toLocaleString() ?? '—'}</td>
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
        )}
      </div>
    );
  }

  // Case 2: Labels ARE present
  const metrics = evalData.metrics_table || [];
  const matrices = evalData.confusion_matrices || {};
  const agreement = evalData.agreement_table || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner */}
      <div className="alert-banner success" style={{ marginBottom: 0 }}>
        <CheckCircle2 size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Dynamic Ground-Truth Evaluation Active</div>
          <div style={{ fontSize: '0.8125rem', marginTop: '0.2rem' }}>
            Evaluating across <b>{evalData.n_total?.toLocaleString()}</b> transactions containing{' '}
            <b>{evalData.n_pos}</b> verified fraud instances (Prevalence: <b>{evalData.prevalence_pct?.toFixed(4)}%</b>).
            Notice: <code>isFraud</code> was strictly excluded from feature inputs during model inference.
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="kpi-grid">
        <KpiCard
          label="Evaluated Rows"
          value={evalData.n_total?.toLocaleString()}
          subtext="Active evaluated batch"
          icon={<FileCheck size={16} />}
        />
        <KpiCard
          label="Ground Truth Frauds"
          value={evalData.n_pos}
          subtext={`Prevalence: ${evalData.prevalence_pct?.toFixed(4)}%`}
          icon={<AlertTriangle size={16} />}
          badge="Verified Positives"
          badgeType="danger"
        />
        <KpiCard
          label="Priority Score Recall"
          value={
            metrics.find((m) => m.method === 'Combined priority score')?.recall !== undefined
              ? `${(metrics.find((m) => m.method === 'Combined priority score').recall * 100).toFixed(1)}%`
              : '—'
          }
          subtext="Frauds caught in triage"
          icon={<Award size={16} />}
          badge="Combined Triage"
          badgeType="success"
        />
        <KpiCard
          label="Priority Score Precision"
          value={
            metrics.find((m) => m.method === 'Combined priority score')?.precision !== undefined
              ? `${(metrics.find((m) => m.method === 'Combined priority score').precision * 100).toFixed(1)}%`
              : '—'
          }
          subtext="Alert triage accuracy"
          icon={<TrendingUp size={16} />}
          badge="Combined Triage"
          badgeType="primary"
        />
      </div>

      {/* Performance Metric Comparison Table */}
      <div className="dashboard-card">
        <div className="card-title-row">
          <div>
            <div className="card-title">
              <Award size={18} color="var(--primary)" />
              <span>Detection Metric Comparison Across Methods</span>
            </div>
            <div className="card-caption">
              Evaluated on the active dataset at the calibrated 0.20% alert rate threshold
            </div>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Detection Method</th>
                <th>Alerts Flagged</th>
                <th>TP</th>
                <th>FP</th>
                <th>FN</th>
                <th>TN</th>
                <th>Precision</th>
                <th>Recall</th>
                <th>F1 Score</th>
                <th>False Positive Rate</th>
                <th>Average Precision</th>
                <th>Pipeline Time</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((row) => {
                const isPriority = row.method === 'Combined priority score';
                const isRandom = row.method.includes('Random');

                return (
                  <tr
                    key={row.method}
                    style={{
                      fontWeight: isPriority ? 700 : 400,
                      background: isPriority ? '#eff6ff' : isRandom ? '#fafafa' : 'inherit',
                    }}
                  >
                    <td style={{ color: isPriority ? 'var(--primary)' : 'inherit' }}>
                      {isPriority ? '🌟 Combined Priority Score' : row.method}
                    </td>
                    <td>{row.flagged?.toLocaleString() ?? '—'}</td>
                    <td style={{ color: '#15803d', fontWeight: 700 }}>{row.TP ?? '—'}</td>
                    <td style={{ color: '#b45309' }}>{row.FP ?? '—'}</td>
                    <td style={{ color: '#b91c1c' }}>{row.FN ?? '—'}</td>
                    <td>{row.TN?.toLocaleString() ?? '—'}</td>
                    <td>{row.precision !== null ? `${(row.precision * 100).toFixed(2)}%` : '—'}</td>
                    <td>{row.recall !== null ? `${(row.recall * 100).toFixed(2)}%` : '—'}</td>
                    <td>{row.F1 !== null ? `${(row.F1 * 100).toFixed(2)}%` : '—'}</td>
                    <td>{row.false_positive_rate !== null ? `${(row.false_positive_rate * 100).toFixed(4)}%` : '—'}</td>
                    <td>{row.average_precision !== null ? `${(row.average_precision * 100).toFixed(2)}%` : '—'}</td>
                    <td>{row.seconds !== null ? `${row.seconds.toFixed(2)}s` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Model Agreement & Fraud Concentration */}
      <div className="dashboard-card" style={{ marginBottom: 0 }}>
        <div className="card-title-row">
          <div>
            <div className="card-title">
              <Layers size={18} color="var(--primary)" />
              <span>Model Agreement &amp; Fraud Concentration</span>
            </div>
            <div className="card-caption">
              Empirical fraud density across consensus categories (Dual Model vs. Single Model vs. Neither)
            </div>
          </div>
        </div>

        <ModelAgreementChart
          agreementData={agreement}
          prevalence={evalData.prevalence}
        />
      </div>

      {/* Confusion Matrices (All 4 Methods Side by Side) */}
      <div className="dashboard-card">
        <div className="card-title-row">
          <div>
            <div className="card-title">
              <BarChart2 size={18} color="var(--primary)" />
              <span>Confusion Matrices Across All Detection Approaches</span>
            </div>
            <div className="card-caption">
              Displays True Negatives (TN), False Positives (FP), False Negatives (FN), and True Positives (TP)
            </div>
          </div>
        </div>

        <ConfusionMatrixCard matrices={matrices} />
      </div>

    </div>
  );
}
