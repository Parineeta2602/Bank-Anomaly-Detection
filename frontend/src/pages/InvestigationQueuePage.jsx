import React, { useState, useEffect } from 'react';
import {
  ListFilter,
  Download,
  Search,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ArrowUpDown,
  RotateCcw,
} from 'lucide-react';

export default function InvestigationQueuePage({ systemStatus, onInspectRow, setActivePage }) {
  const [transactions, setTransactions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [hasScored, setHasScored] = useState(true);
  const [loading, setLoading] = useState(false);

  const calibratedCutoff = systemStatus?.thresholds?.priority_cutoff ?? 82.68546;

  // Filter States
  const [minPriority, setMinPriority] = useState(Math.round(calibratedCutoff * 10) / 10);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [consensus, setConsensus] = useState('all');
  const [searchAccount, setSearchAccount] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState('priority');
  const [sortDir, setSortDir] = useState('desc');

  const allTypes = ['TRANSFER', 'CASH_OUT', 'PAYMENT', 'DEBIT', 'CASH_IN'];

  const fetchQueue = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (minPriority !== undefined && minPriority !== null) params.append('min_priority', minPriority);
    if (selectedTypes.length > 0) params.append('types', selectedTypes.join(','));
    if (consensus && consensus !== 'all') params.append('consensus', consensus);
    if (searchAccount.trim()) params.append('search', searchAccount.trim());
    params.append('page', page);
    params.append('page_size', pageSize);
    params.append('sort_by', sortBy);
    params.append('sort_dir', sortDir);

    fetch(`/api/investigation/queue?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        setHasScored(json.has_scored !== false);
        setTransactions(json.transactions || []);
        setTotalCount(json.total_count || 0);
        setFilteredCount(json.filtered_count || 0);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchQueue();
  }, [minPriority, selectedTypes, consensus, searchAccount, page, pageSize, sortBy, sortDir]);

  const handleTypeToggle = (t) => {
    if (selectedTypes.includes(t)) {
      setSelectedTypes(selectedTypes.filter((x) => x !== t));
    } else {
      setSelectedTypes([...selectedTypes, t]);
    }
    setPage(1);
  };

  const resetFilters = () => {
    setMinPriority(Math.round(calibratedCutoff * 10) / 10);
    setSelectedTypes([]);
    setConsensus('all');
    setSearchAccount('');
    setPage(1);
    setSortBy('priority');
    setSortDir('desc');
  };

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  };

  const getExportUrl = (scope) => {
    const params = new URLSearchParams();
    params.append('scope', scope);
    if (minPriority !== undefined) params.append('min_priority', minPriority);
    if (selectedTypes.length > 0) params.append('types', selectedTypes.join(','));
    if (consensus !== 'all') params.append('consensus', consensus);
    if (searchAccount.trim()) params.append('search', searchAccount.trim());
    return `/api/investigation/export?${params.toString()}`;
  };

  if (!hasScored) {
    return (
      <div className="dashboard-card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
        <ListFilter size={48} color="var(--primary)" style={{ margin: '0 auto 1rem auto' }} />
        <h2 style={{ fontSize: '1.25rem', color: 'var(--text-navy-bold)' }}>No Active Scored Transactions</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '500px', margin: '0.5rem auto 1.5rem auto' }}>
          Please complete Step 1 (Upload &amp; Analyze) by loading a dataset and running the anomaly detection pipeline.
        </p>
        <button className="btn btn-primary" onClick={() => setActivePage('upload')}>
          Go to Upload &amp; Analyze &rarr;
        </button>
      </div>
    );
  }

  const totalPages = Math.ceil(filteredCount / pageSize) || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Triage Guidance Callout */}
      <div className="alert-banner info" style={{ marginBottom: 0 }}>
        <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <b>Operational Compliance Triage Principle:</b> The Priority Score is an operational ranking (0–100) indicating investigation triage urgency.
          It combines model outlier severity (50%), behavioral deviation (25%), dual-model consensus (15%), and account emptying urgency (10%).
          <b> It represents triage priority, NOT statistical fraud probability.</b>
        </div>
      </div>

      {/* Dynamic Multi-Criteria Filters Toolbar */}
      <div className="dashboard-card" style={{ marginBottom: 0, padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sliders size={16} color="var(--primary)" />
            <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Multi-Criteria Triage Filters</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={resetFilters} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <RotateCcw size={12} />
            <span>Reset Filters</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 1fr 1.2fr', gap: '1.25rem', alignItems: 'end' }}>
          {/* Priority Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem' }}>
              <span style={{ fontWeight: 600 }}>Min Priority Score:</span>
              <span style={{ fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                &ge; {minPriority}
                {minPriority >= Math.floor(calibratedCutoff) && (
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>
                    (Calibrated &ge; {calibratedCutoff.toFixed(1)})
                  </span>
                )}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="0.5"
              value={minPriority}
              onChange={(e) => { setMinPriority(parseFloat(e.target.value)); setPage(1); }}
              style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
              <span>0 (All)</span>
              <span
                style={{ cursor: 'pointer', color: 'var(--primary)', textDecoration: 'underline' }}
                onClick={() => { setMinPriority(Math.round(calibratedCutoff * 10) / 10); setPage(1); }}
              >
                Set Calibrated ({calibratedCutoff.toFixed(1)})
              </span>
              <span>100</span>
            </div>
          </div>

          {/* Type Pills */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem' }}>Transaction Types:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {allTypes.map((t) => {
                const isSelected = selectedTypes.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => handleTypeToggle(t)}
                    style={{
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-pill)',
                      border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-light)'}`,
                      background: isSelected ? 'var(--bg-accent-badge)' : '#ffffff',
                      color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Model Consensus Dropdown */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem' }}>Consensus Filter:</div>
            <select
              className="form-select"
              value={consensus}
              onChange={(e) => { setConsensus(e.target.value); setPage(1); }}
              style={{ width: '100%' }}
            >
              <option value="all">All Transactions</option>
              <option value="both">🌟 Dual Model Consensus Only</option>
              <option value="if_only">Isolation Forest Only</option>
              <option value="svm_only">One-Class SVM Only</option>
              <option value="either">Either Model Flagged</option>
            </select>
          </div>

          {/* Account Search */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem' }}>Search Account ID:</div>
            <div style={{ position: 'relative' }}>
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 10, top: 10 }} />
              <input
                type="text"
                className="form-input"
                placeholder="e.g. C135832352"
                value={searchAccount}
                onChange={(e) => { setSearchAccount(e.target.value); setPage(1); }}
                style={{ width: '100%', paddingLeft: '28px' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table & Actions Header */}
      <div className="dashboard-card" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-navy-bold)' }}>
              Prioritized Triage Queue ({filteredCount.toLocaleString()} Matching Cases)
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Filtered from {totalCount.toLocaleString()} scored transactions &bull; Sorted by Priority Score descending
            </div>
          </div>

          {/* CSV Download Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <a
              href={getExportUrl('queue')}
              download="investigation_queue.csv"
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Download size={14} />
              <span>Export Filtered Queue (CSV)</span>
            </a>
            <a
              href={getExportUrl('all')}
              download="all_scored_transactions.csv"
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Download size={14} />
              <span>Export All Scored (CSV)</span>
            </a>
          </div>
        </div>

        {/* Prioritized Transactions Table */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('rank')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span>Rank</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('step')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span>Step</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th>Type</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('amount')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span>Amount</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('priority')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span>Priority Score</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th>Model Agreement</th>
                <th>Sender (Orig)</th>
                <th>Recipient (Dest)</th>
                {transactions[0]?.isFraud !== undefined && <th>Ground Truth</th>}
                <th style={{ minWidth: '240px' }}>Audit Explanation</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '2.5rem' }}>
                    <div className="spinner" style={{ margin: '0 auto 0.5rem auto', borderTopColor: 'var(--primary)' }}></div>
                    Filtering prioritized transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    No transactions match the selected criteria (min priority: {minPriority}). Try lowering the priority cutoff slider.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isBoth = tx.if_flag && tx.svm_flag;
                  const isHighPriority = tx.priority >= calibratedCutoff;

                  return (
                    <tr
                      key={tx.row_id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => onInspectRow(tx.row_id)}
                    >
                      <td style={{ fontWeight: 800, color: 'var(--text-navy-bold)', fontFamily: 'var(--font-mono)' }}>
                        #{tx.rank}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{tx.step}</td>
                      <td>
                        <span className="badge badge-neutral" style={{ fontWeight: 700 }}>
                          {tx.type}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        ${tx.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span
                            className={`badge ${isHighPriority ? 'badge-danger' : 'badge-warning'}`}
                            style={{ fontFamily: 'var(--font-mono)', fontWeight: 800 }}
                          >
                            {tx.priority.toFixed(1)}
                          </span>
                        </div>
                      </td>
                      <td>
                        {isBoth ? (
                          <span className="badge badge-success">Dual Consensus</span>
                        ) : tx.if_flag ? (
                          <span className="badge badge-primary">IF Only</span>
                        ) : tx.svm_flag ? (
                          <span className="badge badge-warning">SVM Only</span>
                        ) : (
                          <span className="badge badge-neutral">Combined Ev.</span>
                        )}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                        {tx.nameOrig}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                        {tx.nameDest}
                      </td>
                      {tx.isFraud !== undefined && (
                        <td>
                          {tx.isFraud === 1 ? (
                            <span className="badge badge-danger">🚨 Fraud</span>
                          ) : (
                            <span className="badge badge-neutral">Normal</span>
                          )}
                        </td>
                      )}
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tx.explanation}
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onInspectRow(tx.row_id);
                          }}
                          style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                        >
                          <Eye size={12} />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '1rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}>
          <div>
            Showing <b>{Math.min((page - 1) * pageSize + 1, filteredCount)}</b> to{' '}
            <b>{Math.min(page * pageSize, filteredCount)}</b> of <b>{filteredCount.toLocaleString()}</b> candidates
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>Rows per page:</span>
              <select
                className="form-select"
                value={pageSize}
                onChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(1); }}
                style={{ padding: '2px 6px', fontSize: '0.75rem' }}
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                style={{ padding: '3px 6px' }}
              >
                <ChevronLeft size={14} />
              </button>
              <span style={{ padding: '0 6px', fontWeight: 600 }}>
                Page {page} of {totalPages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                style={{ padding: '3px 6px' }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
