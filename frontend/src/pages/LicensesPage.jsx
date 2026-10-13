import React from 'react';
import { KeyRound, ShieldAlert, Clock, CheckCircle } from 'lucide-react';

export function LicensesPage() {
  return (
    <div className="placeholder-view">
      <div className="placeholder-icon-box">
        <KeyRound size={32} />
      </div>
      <h2 className="placeholder-title">Software License Management</h2>
      <p className="placeholder-desc">
        Enterprise software license portfolio tracking, vendor contracts, seat capacity vs allocation monitoring, license keys, and compliance verification.
      </p>
      <div style={{ marginBottom: '24px' }}>
        <span className="placeholder-badge">
          <Clock size={16} />
          Coming in Module 5: Software License Management
        </span>
      </div>
      <div style={{ textAlign: 'left', backgroundColor: 'var(--color-slate-50)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', maxWidth: '520px', margin: '0 auto' }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-slate-800)', marginBottom: '8px' }}>
          Staged Capabilities in Module 5:
        </h4>
        <ul style={{ fontSize: '0.84rem', color: 'var(--color-slate-600)', paddingLeft: '20px', lineHeight: 1.6 }}>
          <li>Software title catalog (JetBrains, Microsoft 365, Docker Pro, Figma, AWS)</li>
          <li>Seat utilization calculation (Allocated Seats vs Total Purchased Seats)</li>
          <li>Seat allocation to designated employees with unique allocation timestamps</li>
          <li>Prevention of over-allocation exceeding purchased license bounds</li>
        </ul>
      </div>
    </div>
  );
}
