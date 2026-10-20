import React from 'react';

export default function KpiCard({ label, value, subtext, icon, badge, badgeType = 'neutral' }) {
  return (
    <div className="kpi-card">
      <div className="kpi-header">
        <span className="kpi-label">{label}</span>
        {icon && <div className="kpi-icon-wrap">{icon}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <div className="kpi-value">{value}</div>
        {badge && <span className={`badge badge-${badgeType}`}>{badge}</span>}
      </div>
      {subtext && <div className="kpi-subtext">{subtext}</div>}
    </div>
  );
}
