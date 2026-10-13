import React from 'react';
import { FileBarChart, AlertTriangle, Clock, Download } from 'lucide-react';

export function ReportsPage() {
  return (
    <div className="placeholder-view">
      <div className="placeholder-icon-box">
        <FileBarChart size={32} />
      </div>
      <h2 className="placeholder-title">Lifecycle Reports & Expiry Alerts</h2>
      <p className="placeholder-desc">
        Automated 30-day warranty expiration alerts, software license renewal notifications, inventory status auditing, and exportable CSV compliance spreadsheets.
      </p>
      <div style={{ marginBottom: '24px' }}>
        <span className="placeholder-badge">
          <Clock size={16} />
          Coming in Module 6: Expiry Alerts, Reporting & CSV Export
        </span>
      </div>
      <div style={{ textAlign: 'left', backgroundColor: 'var(--color-slate-50)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', maxWidth: '520px', margin: '0 auto' }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-slate-800)', marginBottom: '8px' }}>
          Staged Capabilities in Module 6:
        </h4>
        <ul style={{ fontSize: '0.84rem', color: 'var(--color-slate-600)', paddingLeft: '20px', lineHeight: 1.6 }}>
          <li>Automated 30-day hardware warranty expiration warning engine</li>
          <li>Upcoming software license subscription renewal flags</li>
          <li>Departmental asset and license distribution breakdown</li>
          <li>Direct CSV report downloads for offline compliance auditing</li>
        </ul>
      </div>
    </div>
  );
}
