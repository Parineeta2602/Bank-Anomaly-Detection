import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileCheck,
  AlertCircle,
  Play,
  CheckCircle2,
  Cpu,
  BarChart2,
  Clock,
  ArrowRight,
  Database,
  Layers,
  HelpCircle,
} from 'lucide-react';
import KpiCard from '../components/KpiCard';
import ScoreDistributionChart from '../components/ScoreDistributionChart';
import DualModelScatterChart from '../components/DualModelScatterChart';

export default function UploadAnalyzePage({
  systemStatus,
  datasetState,
  pipelineResults,
  onUploadFile,
  onLoadSample,
  onRunPipeline,
  setActivePage,
  onInspectRow,
  loading,
}) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const validation = datasetState?.validation || {};
  const preview = datasetState?.preview || [];
  const isValid = validation.is_valid;
  const hasScored = pipelineResults?.has_scored;
  const summaryStats = pipelineResults?.summary_stats || {};
  const runtimes = pipelineResults?.runtimes || {};

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onUploadFile(e.target.files[0]);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Step 1: Upload & Ingestion Section */}
      <div className="dashboard-card">
        <div className="card-title-row">
          <div>
            <div className="card-title">
              <UploadCloud size={18} color="var(--primary)" />
              <span>1. Ingest Transaction Batch (CSV / GZIP)</span>
            </div>
            <div className="card-caption">
              Upload transactions conforming to the 7 PaySim core columns (step, type, amount, oldbalanceOrg, newbalanceOrig, oldbalanceDest, newbalanceDest)
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => onLoadSample('sample')}>
              📄 Sample (1,000 txns)
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => onLoadSample('labeled')}>
              🏷️ Labeled (2,500 txns)
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => onLoadSample('benchmark')}>
              🏆 Full Test (37,653 txns)
            </button>
          </div>
        </div>

        {/* Drag & Drop Area */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border-light)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '2rem 1.5rem',
            textAlign: 'center',
            background: dragOver ? 'var(--bg-accent-subtle)' : '#fafafa',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            marginBottom: '1rem',
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv,.gz"
            style={{ display: 'none' }}
          />
          <UploadCloud size={36} color="var(--primary)" style={{ margin: '0 auto 0.75rem auto' }} />
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
            Drag and drop transaction CSV here, or <span style={{ color: 'var(--primary)', textDecoration: 'underline' }}>browse</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Supports .csv and .csv.gz &bull; Ground truth <code>isFraud</code> is optional and strictly separated from model scoring
          </div>
        </div>

        {/* Validation Report & Schema Check */}
        {datasetState && (
          <div style={{ background: '#f8fafc', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isValid ? (
                  <CheckCircle2 size={18} color="var(--success)" />
                ) : (
                  <AlertCircle size={18} color="var(--danger)" />
                )}
                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: isValid ? 'var(--success)' : 'var(--danger)' }}>
                  {isValid ? `Schema Valid: ${datasetState.row_count?.toLocaleString()} transactions ready for scoring` : 'Schema Validation Failed'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span className="badge badge-primary">{datasetState.dataset_name}</span>
                {validation.has_fraud_label ? (
                  <span className="badge badge-success">Ground Truth Label: isFraud Detected</span>
                ) : (
                  <span className="badge badge-neutral">Production Mode (No isFraud label)</span>
                )}
              </div>
            </div>

            {/* Validation errors/warnings */}
            {validation.errors && validation.errors.length > 0 && (
              <div style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: '0.35rem' }}>
                {validation.errors.map((err, i) => (
                  <div key={i}>&bull; {err}</div>
                ))}
              </div>
            )}
            {validation.warnings && validation.warnings.length > 0 && (
              <div style={{ color: 'var(--warning)', fontSize: '0.75rem', marginTop: '0.35rem' }}>
                {validation.warnings.map((w, i) => (
                  <div key={i}>&bull; {w}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Data Preview */}
        {preview.length > 0 && (
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.45rem' }}>
              Raw Data Preview (First 10 Rows)
            </div>
            <div className="table-container" style={{ maxHeight: '220px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    {Object.keys(preview[0] || {}).map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, idx) => (
                    <tr key={idx}>
                      {Object.entries(row).map(([k, val], cidx) => (
                        <td key={cidx} style={{ fontFamily: typeof val === 'number' ? 'var(--font-mono)' : 'inherit' }}>
                          {typeof val === 'number' ? val.toLocaleString() : String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Execution Trigger Bar */}
        {isValid && (
          <div style={{
            marginTop: '1.25rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-navy-bold)' }}>
                Ready to Execute Anomaly Pipeline
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Transforms 16 scaled features &bull; Runs Isolation Forest &amp; One-Class SVM &bull; Ranks Priority (0–100)
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={onRunPipeline}
              disabled={loading}
              style={{ padding: '0.65rem 1.4rem', fontSize: '0.875rem' }}
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  <span>Scoring Transactions...</span>
                </>
              ) : (
                <>
                  <Play size={16} fill="#ffffff" />
                  <span>Run Anomaly Detection Pipeline</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Step 2: Scoring Results & Analytics (Visible after running pipeline) */}
      {hasScored && (
        <>
          {/* KPI Row */}
          <div className="kpi-grid">
            <KpiCard
              label="Scored Rows"
              value={pipelineResults.total_rows?.toLocaleString()}
              subtext={pipelineResults.dataset_name}
              icon={<FileCheck size={16} />}
            />
            <KpiCard
              label="Priority Flagged"
              value={summaryStats.flagged_by_priority?.toLocaleString()}
              subtext={`${summaryStats.flagged_pct?.toFixed(2)}% of batch (≥ 82.69)`}
              icon={<AlertCircle size={16} />}
              badge="Triage Queue"
              badgeType="danger"
            />
            <KpiCard
              label="Isolation Forest Outliers"
              value={summaryStats.flagged_by_if?.toLocaleString()}
              subtext="Cutoff: ≥ 0.6635"
              icon={<Cpu size={16} />}
              badge="IF Model"
              badgeType="primary"
            />
            <KpiCard
              label="One-Class SVM Outliers"
              value={summaryStats.flagged_by_svm?.toLocaleString()}
              subtext="Cutoff: ≥ 1.2512"
              icon={<Layers size={16} />}
              badge="SVM Model"
              badgeType="warning"
            />
            <KpiCard
              label="Dual Consensus"
              value={summaryStats.both_models_count?.toLocaleString()}
              subtext="Flagged by both IF &amp; SVM"
              icon={<CheckCircle2 size={16} />}
              badge="High Confidence"
              badgeType="success"
            />
            <KpiCard
              label="Pipeline Latency"
              value={`${pipelineResults.total_pipeline_time?.toFixed(2)}s`}
              subtext="End-to-end execution"
              icon={<Clock size={16} />}
            />
          </div>

          {/* Score Distributions Section */}
          <div className="dashboard-card">
            <div className="card-title-row">
              <div>
                <div className="card-title">
                  <BarChart2 size={18} color="var(--primary)" />
                  <span>Anomaly Score Distributions &amp; Calibrated Alert Cutoffs</span>
                </div>
                <div className="card-caption">
                  Empirical distributions across Isolation Forest, One-Class SVM, and Operational Priority scores
                </div>
              </div>
            </div>

            <ScoreDistributionChart distributions={pipelineResults.distributions} />
          </div>

          {/* 2-Column: Dual-Model Anomaly Space & Transaction Type Breakdown */}
          <div className="grid-2">
            {/* Dual Model Anomaly Space */}
            <div className="dashboard-card" style={{ marginBottom: 0 }}>
              <div className="card-title-row">
                <div>
                  <div className="card-title">
                    <Layers size={18} color="var(--primary)" />
                    <span>Dual-Model Anomaly Space (IF vs. One-Class SVM)</span>
                  </div>
                  <div className="card-caption">
                    Transactions in top-right quadrant represent consensus outliers flagged by both independent models
                  </div>
                </div>
              </div>

              <DualModelScatterChart
                scatterPoints={pipelineResults.scatter_points}
                thresholds={systemStatus?.thresholds}
                onSelectRow={onInspectRow}
              />
            </div>

            {/* Breakdown by Transaction Type */}
            <div className="dashboard-card" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column' }}>
              <div className="card-title-row">
                <div>
                  <div className="card-title">
                    <BarChart2 size={18} color="var(--primary)" />
                    <span>Flags by Transaction Type</span>
                  </div>
                  <div className="card-caption">
                    Distribution of outlier flags and volume across payment categories
                  </div>
                </div>
              </div>

              <div className="table-container" style={{ flex: 1 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Total</th>
                      <th>Priority Flagged</th>
                      <th>Flag Rate</th>
                      <th>IF Outliers</th>
                      <th>SVM Outliers</th>
                      <th>Mean Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pipelineResults.type_breakdown?.map((row) => (
                      <tr key={row.type}>
                        <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{row.type}</td>
                        <td>{row.total.toLocaleString()}</td>
                        <td style={{ fontWeight: 700, color: row.flagged > 0 ? 'var(--danger)' : 'inherit' }}>
                          {row.flagged.toLocaleString()}
                        </td>
                        <td>
                          <span className={`badge ${row.flag_rate_pct > 1 ? 'badge-danger' : 'badge-neutral'}`}>
                            {row.flag_rate_pct.toFixed(2)}%
                          </span>
                        </td>
                        <td>{row.if_flags.toLocaleString()}</td>
                        <td>{row.svm_flags.toLocaleString()}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>
                          ${row.mean_amount?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Execution Latency Breakdown Table */}
              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Execution Latency Breakdown
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.75rem' }}>
                  <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
                    <div style={{ color: 'var(--text-muted)' }}>IF Scoring</div>
                    <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{runtimes.if_score_seconds?.toFixed(3) || 0}s</div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
                    <div style={{ color: 'var(--text-muted)' }}>SVM Scoring</div>
                    <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{runtimes.svm_score_seconds?.toFixed(3) || 0}s</div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
                    <div style={{ color: 'var(--text-muted)' }}>Priority Ranking</div>
                    <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{summaryStats.runtime_seconds?.toFixed(3) || 0}s</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Jump to Investigation Queue Banner */}
          <div style={{
            background: 'var(--bg-accent-subtle)',
            border: '1px solid var(--bg-accent-badge)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.95rem' }}>
                {summaryStats.flagged_by_priority?.toLocaleString()} High-Risk Transactions Ready for Triage
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Sorted by operational priority with full balance flow attribution and compliance audit explanations
              </div>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setActivePage('investigate')}
            >
              Open Investigation Queue &rarr;
            </button>
          </div>
        </>
      )}
    </div>
  );
}
