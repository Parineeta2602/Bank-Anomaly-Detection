import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import OverviewPage from './pages/OverviewPage';
import UploadAnalyzePage from './pages/UploadAnalyzePage';
import InvestigationQueuePage from './pages/InvestigationQueuePage';
import EvaluationPage from './pages/EvaluationPage';
import CaseInspectorDrawer from './components/CaseInspectorDrawer';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [activePage, setActivePage] = useState('overview');
  const [systemStatus, setSystemStatus] = useState(null);
  const [datasetState, setDatasetState] = useState(null);
  const [pipelineResults, setPipelineResults] = useState(null);
  const [inspectRowId, setInspectRowId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const fetchStatus = () => {
    fetch('/api/system/status')
      .then((res) => res.json())
      .then((json) => {
        setSystemStatus(json);
        if (json.active_dataset?.has_scored && !pipelineResults) {
          fetchPipelineResults();
        }
      })
      .catch((err) => console.error('Status fetch error:', err));
  };

  const fetchPipelineResults = () => {
    fetch('/api/pipeline/results')
      .then((res) => res.json())
      .then((json) => {
        if (json.has_scored) {
          setPipelineResults(json);
        }
      })
      .catch((err) => console.error('Pipeline results fetch error:', err));
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 6000);
  };

  const handleUploadFile = async (file) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/dataset/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');

      setDatasetState(data);
      setPipelineResults(null);
      fetchStatus();
      setActivePage('upload');
      showNotification('success', `File "${data.dataset_name}" successfully validated (${data.row_count?.toLocaleString()} rows).`);
    } catch (err) {
      showNotification('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSample = async (sampleId) => {
    setLoading(true);
    try {
      const res = await fetch('/api/dataset/load-sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sample_id: sampleId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to load sample dataset');

      setDatasetState(data);
      setPipelineResults(null);
      fetchStatus();
      setActivePage('upload');
      showNotification('success', `Loaded "${data.dataset_name}" (${data.row_count?.toLocaleString()} rows). Ready to run pipeline.`);
    } catch (err) {
      showNotification('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunPipeline = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pipeline/run', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Pipeline execution failed');

      setPipelineResults(data);
      fetchStatus();
      showNotification('success', `Pipeline completed in ${data.total_pipeline_time?.toFixed(2)}s! Flagged ${data.summary_stats?.flagged_by_priority?.toLocaleString()} transactions for investigation.`);
    } catch (err) {
      showNotification('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-layout">
      {/* Global Header */}
      <Header
        activePage={activePage}
        setActivePage={setActivePage}
        systemStatus={systemStatus}
      />

      {/* Main Viewport */}
      <main className="main-viewport">
        {/* Floating Notification */}
        {notification && (
          <div
            className={`alert-banner ${notification.type === 'error' ? 'warning' : 'success'}`}
            style={{ marginBottom: '1.25rem', boxShadow: 'var(--shadow-sm)' }}
          >
            {notification.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span style={{ fontWeight: 500 }}>{notification.message}</span>
          </div>
        )}

        {/* Page Routing */}
        {activePage === 'overview' && (
          <OverviewPage
            systemStatus={systemStatus}
            setActivePage={setActivePage}
            onLoadSample={handleLoadSample}
          />
        )}

        {activePage === 'upload' && (
          <UploadAnalyzePage
            systemStatus={systemStatus}
            datasetState={datasetState}
            pipelineResults={pipelineResults}
            onUploadFile={handleUploadFile}
            onLoadSample={handleLoadSample}
            onRunPipeline={handleRunPipeline}
            setActivePage={setActivePage}
            onInspectRow={(id) => setInspectRowId(id)}
            loading={loading}
          />
        )}

        {activePage === 'investigate' && (
          <InvestigationQueuePage
            systemStatus={systemStatus}
            onInspectRow={(id) => setInspectRowId(id)}
            setActivePage={setActivePage}
          />
        )}

        {activePage === 'evaluate' && (
          <EvaluationPage
            systemStatus={systemStatus}
            onLoadSample={handleLoadSample}
            setActivePage={setActivePage}
          />
        )}
      </main>

      {/* Transaction Deep-Dive Inspector Drawer */}
      <CaseInspectorDrawer
        rowId={inspectRowId}
        onClose={() => setInspectRowId(null)}
      />

      {/* Footer */}
      <footer style={{
        background: '#ffffff',
        borderTop: '1px solid var(--border-light)',
        padding: '1rem 1.5rem',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <b>Bank Transaction Anomaly Detector</b> &bull; Operational AML &amp; Triage Dashboard
          </div>
          <div>
            Calibrated 0.20% Alert Budget &bull; Isolation Forest + One-Class SVM &bull; PaySim Architecture
          </div>
        </div>
      </footer>
    </div>
  );
}
