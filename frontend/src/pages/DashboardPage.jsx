import React, { useState, useEffect } from 'react';
import {
  Laptop,
  CheckCircle2,
  Clock,
  KeyRound,
  AlertTriangle,
  Server,
  Activity,
  Layers,
  Shield,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { healthApi } from '../api/healthApi';

export function DashboardPage() {
  const { user } = useAuth();
  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchHealth() {
      try {
        setHealthLoading(true);
        const data = await healthApi.getHealth();
        if (isMounted) setHealthData(data);
      } catch (err) {
        if (isMounted) {
          setHealthData({
            status: 'DOWN',
            healthy: false,
            database: { status: 'DISCONNECTED', engine: 'SQLite 3' }
          });
        }
      } finally {
        if (isMounted) setHealthLoading(false);
      }
    }

    fetchHealth();
    return () => {
      isMounted = false;
    };
  }, []);

  const kpiCards = [
    {
      title: 'Total Hardware Assets',
      icon: Laptop,
      statusBadge: 'Pending Module 4 API',
      moduleNote: 'Hardware asset inventory & specs',
      color: 'primary'
    },
    {
      title: 'Assigned Assets',
      icon: CheckCircle2,
      statusBadge: 'Pending Module 4 API',
      moduleNote: 'Active employee custody tracking',
      color: 'success'
    },
    {
      title: 'Available Assets',
      icon: Clock,
      statusBadge: 'Pending Module 4 API',
      moduleNote: 'Inventory available for assignment',
      color: 'info'
    },
    {
      title: 'Software Licenses',
      icon: KeyRound,
      statusBadge: 'Pending Module 5 API',
      moduleNote: 'Total seat capacity & allocations',
      color: 'primary'
    },
    {
      title: 'Licenses Near Expiry',
      icon: AlertTriangle,
      statusBadge: 'Pending Module 6 API',
      moduleNote: 'Renewals expiring in 30 days',
      color: 'warning'
    }
  ];

  return (
    <div className="dashboard-container">
      {/* Welcome Banner */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-slate-900)' }}>
          Welcome back, {user?.full_name || user?.username || 'Administrator'}
        </h2>
        <p style={{ color: 'var(--color-slate-500)', fontSize: '0.92rem', marginTop: '4px' }}>
          AssetFlow administrative overview &bull; Session lifetime: 8 Hours &bull; Role: {user?.role || 'SUPERADMIN'}
        </p>
      </div>

      {/* Real Backend Health Status Card */}
      <div className="card" style={{ marginBottom: '28px', borderLeft: '4px solid var(--color-primary-600)' }}>
        <div className="card-header" style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Server size={20} color="var(--color-primary-600)" />
            <h3 className="card-title" style={{ fontSize: '1rem' }}>
              Live Backend & Database Health Check
            </h3>
          </div>
          {healthLoading ? (
            <span className="metric-badge badge-info">Checking status...</span>
          ) : healthData?.healthy ? (
            <span className="metric-badge badge-success">
              <span className="status-dot" style={{ width: 6, height: 6 }} aria-hidden="true"></span>
              API & Database Online
            </span>
          ) : (
            <span className="metric-badge" style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger-text)' }}>
              API Offline
            </span>
          )}
        </div>
        <p className="card-description" style={{ marginBottom: '14px' }}>
          Empirically queried from backend route <code>/api/health</code> (SQLite local file storage).
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', fontSize: '0.85rem', color: 'var(--color-slate-600)' }}>
          <div>
            <strong>Service Status:</strong>{' '}
            <span style={{ color: healthData?.healthy ? 'var(--color-success-text)' : 'var(--color-danger-text)', fontWeight: 600 }}>
              {healthData?.status || 'UNKNOWN'}
            </span>
          </div>
          <div>
            <strong>Database Engine:</strong> {healthData?.database?.engine || 'SQLite 3'}
          </div>
          <div>
            <strong>Database Connection:</strong> {healthData?.database?.status || 'CONNECTED'}
          </div>
          {healthData?.database?.tablesFound && (
            <div>
              <strong>Tables Verified:</strong> {healthData.database.tablesFound}
            </div>
          )}
          {healthData?.uptimeSeconds !== undefined && (
            <div>
              <strong>Process Uptime:</strong> {healthData.uptimeSeconds}s
            </div>
          )}
        </div>
      </div>

      {/* Honest Metric KPI Cards */}
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-slate-900)', marginBottom: '4px' }}>
          System Metrics & Inventory Summary
        </h3>
        <p style={{ fontSize: '0.86rem', color: 'var(--color-slate-500)', marginBottom: '16px' }}>
          In accordance with project guidelines, live asset and license counts are staged for subsequent authorized modules.
        </p>
      </div>

      <div className="metrics-grid">
        {kpiCards.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="metric-card">
              <div className="metric-card-top">
                <span className="metric-label">{kpi.title}</span>
                <div className="metric-icon-box">
                  <Icon size={20} />
                </div>
              </div>
              <div className="metric-value-box">
                <span className="metric-value-placeholder">--</span>
              </div>
              <div>
                <span className="metric-badge badge-pending">
                  {kpi.statusBadge}
                </span>
                <p style={{ fontSize: '0.78rem', color: 'var(--color-slate-500)', marginTop: '8px' }}>
                  {kpi.moduleNote}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Staged Implementation Roadmap */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Staged Feature Roadmap</h3>
            <p className="card-description">
              Controlled module progression for the Cloud Computing IT Asset Management Capstone.
            </p>
          </div>
          <span className="metric-badge badge-info">Stage A: Local</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '12px' }}>
          <div style={{ padding: '16px', backgroundColor: 'var(--color-slate-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Layers size={18} color="var(--color-primary-600)" />
              <strong style={{ fontSize: '0.92rem', color: 'var(--color-slate-800)' }}>Module 4: Assets & Custody</strong>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--color-slate-600)', lineHeight: 1.5 }}>
              Hardware asset inventory CRUD, category filters, employee assignment state machine, and historical custody preservation.
            </p>
          </div>

          <div style={{ padding: '16px', backgroundColor: 'var(--color-slate-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <KeyRound size={18} color="var(--color-primary-600)" />
              <strong style={{ fontSize: '0.92rem', color: 'var(--color-slate-800)' }}>Module 5: Software Licenses</strong>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--color-slate-600)', lineHeight: 1.5 }}>
              Enterprise software license tracking, utilized vs total seat calculation, and employee seat allocation enforcement.
            </p>
          </div>

          <div style={{ padding: '16px', backgroundColor: 'var(--color-slate-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <AlertTriangle size={18} color="var(--color-warning-dot)" />
              <strong style={{ fontSize: '0.92rem', color: 'var(--color-slate-800)' }}>Module 6: Expiry & Reporting</strong>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--color-slate-600)', lineHeight: 1.5 }}>
              Automated 30-day warranty and renewal expiry engine, filtered compliance audit tables, and CSV export capabilities.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
