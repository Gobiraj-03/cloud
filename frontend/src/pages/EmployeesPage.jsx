import React from 'react';
import { Users, Building2, Clock, UserCheck } from 'lucide-react';

export function EmployeesPage() {
  return (
    <div className="placeholder-view">
      <div className="placeholder-icon-box">
        <Users size={32} />
      </div>
      <h2 className="placeholder-title">Employee Directory & Custody</h2>
      <p className="placeholder-desc">
        Internal personnel directory, department structures, designation mapping, and active hardware asset custody tracking.
      </p>
      <div style={{ marginBottom: '24px' }}>
        <span className="placeholder-badge">
          <Clock size={16} />
          Coming in Module 4: IT Asset Management & Employee Assignment
        </span>
      </div>
      <div style={{ textAlign: 'left', backgroundColor: 'var(--color-slate-50)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', maxWidth: '520px', margin: '0 auto' }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-slate-800)', marginBottom: '8px' }}>
          Staged Capabilities in Module 4:
        </h4>
        <ul style={{ fontSize: '0.84rem', color: 'var(--color-slate-600)', paddingLeft: '20px', lineHeight: 1.6 }}>
          <li>Directory of employees mapped to departments (Engineering, Design, DevOps, HR)</li>
          <li>Employee assignment profile showing currently held hardware devices</li>
          <li>Historical log of returned, replaced, and active equipment</li>
        </ul>
      </div>
    </div>
  );
}
