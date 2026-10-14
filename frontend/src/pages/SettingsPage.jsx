import React from 'react';
import { Settings, Shield, HardDrive, Key, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function SettingsPage() {
  const { user } = useAuth();

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-slate-900)' }}>
          System Settings & Administrator Configuration
        </h2>
        <p style={{ color: 'var(--color-slate-500)', fontSize: '0.88rem', marginTop: '4px' }}>
          AssetFlow architecture parameters and administrator profile details.
        </p>
      </div>

      {/* Administrator Profile Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserCheck size={20} color="var(--color-primary-600)" />
            <h3 className="card-title">Authenticated Administrator</h3>
          </div>
          <span className="metric-badge badge-success">Active Session</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', fontSize: '0.88rem' }}>
          <div>
            <div style={{ color: 'var(--color-slate-500)', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 600 }}>Full Name</div>
            <div style={{ fontWeight: 600, color: 'var(--color-slate-900)', marginTop: '2px' }}>{user?.full_name || 'IT Administrator'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--color-slate-500)', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 600 }}>Username</div>
            <div style={{ fontWeight: 600, color: 'var(--color-slate-900)', marginTop: '2px' }}>{user?.username || 'admin'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--color-slate-500)', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 600 }}>Official Email</div>
            <div style={{ fontWeight: 600, color: 'var(--color-slate-900)', marginTop: '2px' }}>{user?.email || 'admin@enterprise.local'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--color-slate-500)', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 600 }}>Administrative Role</div>
            <div style={{ fontWeight: 600, color: 'var(--color-primary-700)', marginTop: '2px' }}>{user?.role || 'SUPERADMIN'}</div>
          </div>
        </div>
      </div>

      {/* Security & System Constraints Card */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={20} color="var(--color-primary-600)" />
            <h3 className="card-title">Environment & Security Parameters</h3>
          </div>
          <span className="metric-badge badge-info">&#8377;0 Cloud Budget</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.88rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--color-slate-600)' }}>Architectural Phase</span>
            <span style={{ fontWeight: 600, color: 'var(--color-slate-900)' }}>Stage A: Local Zero-Cost Baseline</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--color-slate-600)' }}>Database Storage</span>
            <span style={{ fontWeight: 600, color: 'var(--color-slate-900)' }}>Local SQLite (data/asset_management.db)</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--color-slate-600)' }}>Authentication Token Storage</span>
            <span style={{ fontWeight: 600, color: 'var(--color-slate-900)' }}>HttpOnly Session Cookie (Zero token in JSON)</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--color-slate-600)' }}>Session Lifetime & Invalidation</span>
            <span style={{ fontWeight: 600, color: 'var(--color-slate-900)' }}>8 Hours (Instant SQLite row deletion on logout)</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--color-slate-600)' }}>CSRF & Origin Policy</span>
            <span style={{ fontWeight: 600, color: 'var(--color-slate-900)' }}>Strict Origin Matching (HTTP 403 on untrusted origins)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
