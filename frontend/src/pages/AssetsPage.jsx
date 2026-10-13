import React from 'react';
import { Laptop, Layers, ShieldCheck, Clock } from 'lucide-react';

export function AssetsPage() {
  return (
    <div className="placeholder-view">
      <div className="placeholder-icon-box">
        <Laptop size={32} />
      </div>
      <h2 className="placeholder-title">Hardware Asset Management</h2>
      <p className="placeholder-desc">
        Comprehensive physical hardware inventory tracking, category classification (Laptops, Desktops, Monitors, Servers), lifecycle state machine (Available, Assigned, Under Maintenance, Retired), and employee custody assignment history.
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
          <li>Hardware asset registration and unique asset tag enforcement</li>
          <li>Hardware specification details (Serial, RAM, Storage, CPU)</li>
          <li>Employee assignment and asset return workflows</li>
          <li>Immutable assignment custody history in <code>asset_assignment_history</code></li>
        </ul>
      </div>
    </div>
  );
}
