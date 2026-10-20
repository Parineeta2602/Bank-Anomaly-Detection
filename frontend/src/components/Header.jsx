import React from 'react';
import { ShieldCheck, Activity, Database, FileSpreadsheet, ListFilter, Award, CheckCircle2 } from 'lucide-react';

export default function Header({ activePage, setActivePage, systemStatus }) {
  const activeDataset = systemStatus?.active_dataset || {};
  const isReady = systemStatus?.models_ready;

  return (
    <header className="top-header">
      <div className="header-inner">
        {/* Brand */}
        <div className="brand-section">
          <div className="brand-icon">
            <ShieldCheck size={22} strokeWidth={2.2} />
          </div>
          <div className="brand-title-group">
            <h1>Bank Transaction Anomaly Detector</h1>
            <p>Operational Surveillance &amp; Triage Engine &bull; Isolation Forest + One-Class SVM</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="nav-tabs">
          <button
            className={`nav-tab ${activePage === 'overview' ? 'active' : ''}`}
            onClick={() => setActivePage('overview')}
          >
            <Activity size={15} />
            <span>Overview</span>
          </button>
          <button
            className={`nav-tab ${activePage === 'upload' ? 'active' : ''}`}
            onClick={() => setActivePage('upload')}
          >
            <FileSpreadsheet size={15} />
            <span>Upload &amp; Analyze</span>
          </button>
          <button
            className={`nav-tab ${activePage === 'investigate' ? 'active' : ''}`}
            onClick={() => setActivePage('investigate')}
          >
            <ListFilter size={15} />
            <span>Investigation Queue</span>
            {activeDataset.flagged_count > 0 && (
              <span className="badge badge-danger" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                {activeDataset.flagged_count}
              </span>
            )}
          </button>
          <button
            className={`nav-tab ${activePage === 'evaluate' ? 'active' : ''}`}
            onClick={() => setActivePage('evaluate')}
          >
            <Award size={15} />
            <span>Evaluation</span>
            {activeDataset.has_labels && (
              <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                Labels Active
              </span>
            )}
          </button>
        </nav>

        {/* Live System Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {activeDataset.name && activeDataset.name !== 'None loaded' ? (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-main)', maxWidth: '180px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {activeDataset.name}
              </div>
              <div>{activeDataset.row_count?.toLocaleString()} rows &bull; {activeDataset.has_scored ? 'Scored' : 'Loaded'}</div>
            </div>
          ) : null}

          <div className="header-status-badge">
            <span className="pulse-dot"></span>
            <span>{isReady ? 'Models Ready' : 'Initializing'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
