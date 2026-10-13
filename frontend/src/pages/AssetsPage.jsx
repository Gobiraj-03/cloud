import React, { useState, useEffect, useCallback } from 'react';
import {
  Laptop,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
  UserCheck,
  RotateCcw,
  History,
  AlertCircle,
  X,
  CheckCircle2,
  Clock,
  Wrench,
  Archive,
  Info
} from 'lucide-react';
import { assetApi } from '../api/assetApi';
import { employeeApi } from '../api/employeeApi';

const CATEGORIES = ['LAPTOP', 'DESKTOP', 'SERVER', 'MOBILE', 'TABLET', 'OTHER'];
const STATUSES = ['AVAILABLE', 'ASSIGNED', 'UNDER_MAINTENANCE', 'RETIRED'];

export function AssetsPage() {
  const [assets, setAssets] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Active employees for assignment dropdown
  const [employees, setEmployees] = useState([]);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [assigningAsset, setAssigningAsset] = useState(null);
  const [returningAsset, setReturningAsset] = useState(null);
  const [historyAsset, setHistoryAsset] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Modal form states
  const [formData, setFormData] = useState({
    asset_tag: '',
    name: '',
    category: 'LAPTOP',
    manufacturer: '',
    model: '',
    serial_number: '',
    purchase_date: '',
    purchase_cost: '',
    warranty_expiry_date: '',
    status: 'AVAILABLE',
    specifications: ''
  });
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Assignment modal form
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [assignError, setAssignError] = useState(null);

  // Return modal form
  const [returnNotes, setReturnNotes] = useState('');
  const [returnError, setReturnError] = useState(null);

  // Fetch assets
  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await assetApi.list({
        search: search.trim(),
        category: categoryFilter,
        status: statusFilter,
        page,
        limit
      });
      setAssets(res.assets || []);
      setTotalCount(res.pagination?.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load assets from server.');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter, page]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Load employees for assignment selection
  const loadEmployees = async () => {
    try {
      const res = await employeeApi.list({ limit: 100 });
      // Only active employees can hold assets
      setEmployees((res.employees || []).filter(e => e.status === 'ACTIVE'));
    } catch (err) {
      console.error('Failed to load employees for assignment:', err);
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormData({
      asset_tag: '',
      name: '',
      category: 'LAPTOP',
      manufacturer: '',
      model: '',
      serial_number: '',
      purchase_date: '',
      purchase_cost: '',
      warranty_expiry_date: '',
      status: 'AVAILABLE',
      specifications: ''
    });
    setFormError(null);
    setShowCreateModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (asset) => {
    setEditingAsset(asset);
    setFormData({
      asset_tag: asset.asset_tag || '',
      name: asset.name || '',
      category: asset.category || 'LAPTOP',
      manufacturer: asset.manufacturer || '',
      model: asset.model || '',
      serial_number: asset.serial_number || '',
      purchase_date: asset.purchase_date || '',
      purchase_cost: asset.purchase_cost !== null && asset.purchase_cost !== undefined ? String(asset.purchase_cost) : '',
      warranty_expiry_date: asset.warranty_expiry_date || '',
      status: asset.status || 'AVAILABLE',
      specifications: typeof asset.specifications === 'object' ? JSON.stringify(asset.specifications) : (asset.specifications || '')
    });
    setFormError(null);
  };

  // Open Assign Modal
  const handleOpenAssign = async (asset) => {
    setAssigningAsset(asset);
    setAssignEmployeeId('');
    setAssignNotes('');
    setAssignError(null);
    await loadEmployees();
  };

  // Open Return Modal
  const handleOpenReturn = (asset) => {
    setReturningAsset(asset);
    setReturnNotes('');
    setReturnError(null);
  };

  // Open History Modal
  const handleOpenHistory = async (asset) => {
    setHistoryAsset(asset);
    setHistoryLoading(true);
    try {
      const hist = await assetApi.getHistory(asset.id);
      setHistoryList(hist || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Submit Create or Edit
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Asset name is required.');
      return;
    }
    if (!editingAsset && !formData.asset_tag.trim()) {
      setFormError('Asset tag is required.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        category: formData.category,
        manufacturer: formData.manufacturer.trim() || null,
        model: formData.model.trim() || null,
        serial_number: formData.serial_number.trim() || null,
        purchase_date: formData.purchase_date || null,
        purchase_cost: formData.purchase_cost !== '' ? Number(formData.purchase_cost) : null,
        warranty_expiry_date: formData.warranty_expiry_date || null,
        specifications: formData.specifications.trim() || null
      };

      if (!editingAsset) {
        payload.asset_tag = formData.asset_tag.trim();
        payload.status = formData.status;
        await assetApi.create(payload);
        setShowCreateModal(false);
      } else {
        // Status can only be edited if not assigned
        if (editingAsset.status !== 'ASSIGNED') {
          payload.status = formData.status;
        }
        await assetApi.update(editingAsset.id, payload);
        setEditingAsset(null);
      }

      await fetchAssets();
    } catch (err) {
      setFormError(err.message || 'Operation failed. Please check your inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Assignment
  const handleSubmitAssign = async (e) => {
    e.preventDefault();
    setAssignError(null);

    if (!assignEmployeeId) {
      setAssignError('Please select an active employee to assign this asset to.');
      return;
    }

    try {
      setSubmitting(true);
      await assetApi.assign(assigningAsset.id, Number(assignEmployeeId), assignNotes.trim());
      setAssigningAsset(null);
      await fetchAssets();
    } catch (err) {
      setAssignError(err.message || 'Failed to assign asset.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Return
  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    setReturnError(null);

    try {
      setSubmitting(true);
      await assetApi.returnAsset(returningAsset.id, returnNotes.trim());
      setReturningAsset(null);
      await fetchAssets();
    } catch (err) {
      setReturnError(err.message || 'Failed to return asset.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Asset
  const handleDeleteAsset = async (asset) => {
    const confirmMessage = `Are you sure you want to delete asset "${asset.name}" (${asset.asset_tag})?\n\nAssets with custody history cannot be deleted to preserve audit compliance.`;
    if (!window.confirm(confirmMessage)) return;

    try {
      await assetApi.delete(asset.id);
      await fetchAssets();
    } catch (err) {
      alert(`Deletion rejected: ${err.message}`);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return <span className="status-pill status-pill-available"><CheckCircle2 size={12} /> Available</span>;
      case 'ASSIGNED':
        return <span className="status-pill status-pill-assigned"><UserCheck size={12} /> Assigned</span>;
      case 'UNDER_MAINTENANCE':
        return <span className="status-pill status-pill-maintenance"><Wrench size={12} /> Maintenance</span>;
      case 'RETIRED':
        return <span className="status-pill status-pill-retired"><Archive size={12} /> Retired</span>;
      default:
        return <span className="status-pill status-pill-retired">{status}</span>;
    }
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--color-slate-900)' }}>
            Hardware Asset Inventory
          </h2>
          <p style={{ color: 'var(--color-slate-500)', fontSize: '0.88rem', marginTop: '2px' }}>
            Track physical equipment, manage lifecycle states, and monitor employee custody history.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-outline" onClick={fetchAssets} disabled={loading} title="Refresh inventory">
            <RefreshCw size={16} className={loading ? 'spinner' : ''} />
            Refresh
          </button>
          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <Plus size={16} />
            Add Asset
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="alert-banner alert-danger" role="alert">
          <AlertCircle size={20} />
          <div style={{ flex: 1 }}>
            <strong>Unable to load assets:</strong> {error}
          </div>
          <button className="btn btn-outline btn-sm" onClick={fetchAssets}>Retry</button>
        </div>
      )}

      {/* Table Card */}
      <div className="table-card">
        {/* Table Toolbar */}
        <div className="table-toolbar">
          <div className="table-filters">
            <div className="search-input-wrapper">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search by tag, name, or serial..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <select
              className="filter-select"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by Category"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>

            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by Status"
            >
              <option value="">All Statuses</option>
              {STATUSES.map(st => <option key={st} value={st}>{st.replace('_', ' ')}</option>)}
            </select>
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--color-slate-500)', fontWeight: 500 }}>
            Total: <strong>{totalCount}</strong> assets
          </div>
        </div>

        {/* Table Content */}
        <div className="table-responsive">
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-slate-500)' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
              Loading assets from database...
            </div>
          ) : assets.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-slate-500)' }}>
              <Laptop size={36} color="var(--color-slate-300)" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 600, color: 'var(--color-slate-700)' }}>No hardware assets found</p>
              <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                {search || categoryFilter || statusFilter
                  ? 'Try clearing or modifying your search filters.'
                  : 'Get started by registering your first hardware asset.'}
              </p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Asset Tag</th>
                  <th>Device Name</th>
                  <th>Category</th>
                  <th>Model / Serial</th>
                  <th>Status</th>
                  <th>Current Custody</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id}>
                    <td>
                      <strong style={{ color: 'var(--color-slate-900)', fontFamily: 'monospace' }}>
                        {asset.asset_tag}
                      </strong>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--color-slate-800)' }}>{asset.name}</div>
                      {asset.manufacturer && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-slate-500)' }}>
                          {asset.manufacturer}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--color-slate-600)' }}>
                        {asset.category}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem', color: 'var(--color-slate-700)' }}>
                        {asset.model || '—'}
                      </div>
                      {asset.serial_number && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)', fontFamily: 'monospace' }}>
                          S/N: {asset.serial_number}
                        </div>
                      )}
                    </td>
                    <td>{getStatusBadge(asset.status)}</td>
                    <td>
                      {asset.current_employee_id ? (
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--color-primary-700)' }}>
                            {asset.current_employee_name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>
                            {asset.current_employee_dept} &bull; {asset.current_employee_code}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-slate-400)' }}>Unassigned</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                        {/* Assign Button (Only for AVAILABLE) */}
                        {asset.status === 'AVAILABLE' && (
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => handleOpenAssign(asset)}
                            title="Assign to Employee"
                          >
                            <UserCheck size={14} />
                            Assign
                          </button>
                        )}

                        {/* Return Button (Only for ASSIGNED) */}
                        {asset.status === 'ASSIGNED' && (
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => handleOpenReturn(asset)}
                            title="Return Asset"
                          >
                            <RotateCcw size={14} />
                            Return
                          </button>
                        )}

                        {/* History Button */}
                        <button
                          className="btn-icon"
                          onClick={() => handleOpenHistory(asset)}
                          title="View Custody History"
                          aria-label={`View history for ${asset.asset_tag}`}
                        >
                          <History size={16} />
                        </button>

                        {/* Edit Button */}
                        <button
                          className="btn-icon"
                          onClick={() => handleOpenEdit(asset)}
                          title="Edit Asset Details"
                          aria-label={`Edit ${asset.asset_tag}`}
                        >
                          <Edit2 size={16} />
                        </button>

                        {/* Delete Button */}
                        <button
                          className="btn-icon danger"
                          onClick={() => handleDeleteAsset(asset)}
                          title="Delete Asset"
                          aria-label={`Delete ${asset.asset_tag}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Table Pagination */}
        <div className="table-pagination">
          <div>
            Showing page <strong>{page}</strong> of <strong>{totalPages}</strong>
          </div>
          <div className="pagination-controls">
            <button
              className="btn btn-outline btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              className="btn btn-outline btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT ASSET MODAL */}
      {(showCreateModal || editingAsset) && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingAsset ? `Edit Asset: ${editingAsset.asset_tag}` : 'Register New Hardware Asset'}
              </h3>
              <button
                className="btn-icon"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingAsset(null);
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm}>
              <div className="modal-body">
                {formError && (
                  <div className="alert-banner alert-danger" style={{ marginBottom: '16px' }}>
                    <AlertCircle size={18} />
                    <span>{formError}</span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Asset Tag *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. AST-2026-0010"
                      value={formData.asset_tag}
                      disabled={!!editingAsset}
                      onChange={(e) => setFormData({ ...formData, asset_tag: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select
                      className="form-input"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Device Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. ThinkPad X1 Carbon Gen 11"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Manufacturer</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Lenovo, Apple, Dell"
                      value={formData.manufacturer}
                      onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Model</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 21HM0004US"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Serial Number</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. PF49K7XZ"
                      value={formData.serial_number}
                      onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Purchase Cost (USD/INR)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      placeholder="e.g. 1499.00"
                      value={formData.purchase_cost}
                      onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Purchase Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.purchase_date}
                      onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Warranty Expiry Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.warranty_expiry_date}
                      onChange={(e) => setFormData({ ...formData, warranty_expiry_date: e.target.value })}
                    />
                  </div>
                </div>

                {/* Status field */}
                {(!editingAsset || editingAsset.status !== 'ASSIGNED') ? (
                  <div className="form-group">
                    <label className="form-label">Lifecycle Status</label>
                    <select
                      className="form-input"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="AVAILABLE">AVAILABLE (In stock / Ready)</option>
                      <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
                      <option value="RETIRED">RETIRED</option>
                    </select>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.84rem', color: 'var(--color-info-text)', backgroundColor: 'var(--color-info-bg)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: '14px' }}>
                    <Info size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
                    This asset is currently <strong>ASSIGNED</strong> to {editingAsset.current_employee_name}. To release or change its status, use the <strong>Return</strong> lifecycle workflow.
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingAsset(null);
                  }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingAsset ? 'Update Asset' : 'Create Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN ASSET MODAL */}
      {assigningAsset && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Assign Asset to Employee</h3>
              <button className="btn-icon" onClick={() => setAssigningAsset(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitAssign}>
              <div className="modal-body">
                <div style={{ backgroundColor: 'var(--color-slate-50)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: '16px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-slate-500)' }}>Assigning Device:</div>
                  <strong style={{ fontSize: '0.98rem', color: 'var(--color-slate-900)' }}>
                    {assigningAsset.name} ({assigningAsset.asset_tag})
                  </strong>
                </div>

                {assignError && (
                  <div className="alert-banner alert-danger" style={{ marginBottom: '16px' }}>
                    <AlertCircle size={18} />
                    <span>{assignError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="assign-employee-select">Select Active Employee *</label>
                  <select
                    id="assign-employee-select"
                    className="form-input"
                    value={assignEmployeeId}
                    onChange={(e) => setAssignEmployeeId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose an employee --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.employee_code}) &bull; {emp.department}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Assignment Notes</label>
                  <textarea
                    className="form-input"
                    rows="3"
                    placeholder="e.g. Issued for standard remote engineering deployment"
                    value={assignNotes}
                    onChange={(e) => setAssignNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setAssigningAsset(null)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RETURN ASSET MODAL */}
      {returningAsset && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Return Asset to Inventory</h3>
              <button className="btn-icon" onClick={() => setReturningAsset(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitReturn}>
              <div className="modal-body">
                <div style={{ backgroundColor: 'var(--color-slate-50)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: '16px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-slate-500)' }}>Returning Device:</div>
                  <strong style={{ fontSize: '0.98rem', color: 'var(--color-slate-900)' }}>
                    {returningAsset.name} ({returningAsset.asset_tag})
                  </strong>
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-slate-600)', marginTop: '4px' }}>
                    Currently held by: <strong>{returningAsset.current_employee_name}</strong>
                  </div>
                </div>

                {returnError && (
                  <div className="alert-banner alert-danger" style={{ marginBottom: '16px' }}>
                    <AlertCircle size={18} />
                    <span>{returnError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Return Notes</label>
                  <textarea
                    className="form-input"
                    rows="3"
                    placeholder="e.g. Device returned in clean physical condition during offboarding"
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setReturningAsset(null)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Returning...' : 'Confirm Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTODY HISTORY MODAL */}
      {historyAsset && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Custody Assignment History</h3>
                <div style={{ fontSize: '0.84rem', color: 'var(--color-slate-500)', marginTop: '2px' }}>
                  {historyAsset.name} &bull; <span style={{ fontFamily: 'monospace' }}>{historyAsset.asset_tag}</span>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setHistoryAsset(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {historyLoading ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-slate-500)' }}>
                  <div className="spinner" style={{ margin: '0 auto 8px' }}></div>
                  Loading historical custody records...
                </div>
              ) : historyList.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-slate-500)' }}>
                  <Clock size={32} color="var(--color-slate-300)" style={{ margin: '0 auto 8px' }} />
                  <p>No prior assignment records found for this asset.</p>
                </div>
              ) : (
                <div className="timeline">
                  {historyList.map((item) => (
                    <div key={item.id} className="timeline-item">
                      <div className={`timeline-dot ${!item.returned_at ? 'active' : ''}`} />
                      <div className="timeline-box">
                        <div className="timeline-header">
                          <span className="timeline-title">
                            {item.employee_name} ({item.employee_code})
                          </span>
                          {!item.returned_at ? (
                            <span className="status-pill status-pill-active" style={{ fontSize: '0.7rem' }}>
                              Active Custody
                            </span>
                          ) : (
                            <span className="status-pill status-pill-retired" style={{ fontSize: '0.7rem' }}>
                              Returned
                            </span>
                          )}
                        </div>
                        <div className="timeline-date">
                          Assigned: {new Date(item.assigned_at).toLocaleString()}
                          {item.returned_at && (
                            <> &bull; Returned: {new Date(item.returned_at).toLocaleString()}</>
                          )}
                        </div>
                        <div className="timeline-body" style={{ marginTop: '6px' }}>
                          <div><strong>Department:</strong> {item.department || '—'}</div>
                          {item.notes && <div><strong>Notes:</strong> {item.notes}</div>}
                          {item.return_notes && <div><strong>Return Notes:</strong> {item.return_notes}</div>}
                          {item.assigned_by_admin && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)', marginTop: '4px' }}>
                              Admin Record: {item.assigned_by_admin}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setHistoryAsset(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
