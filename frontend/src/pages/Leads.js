import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import { leadsAPI, campaignsAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../utils/toast';

const STATUS_OPTS = ['new', 'contacted', 'qualified', 'converted', 'lost'];
const BADGE = {
  new: 'badge-new', contacted: 'badge-contacted',
  qualified: 'badge-qualified', converted: 'badge-converted', lost: 'badge-lost',
};

const emptyForm = {
  name: '', email: '', phone: '', company: '', job_title: '',
  industry: '', linkedin_url: '', status: 'new', notes: '',
  campaign_id: '', source: 'linkedin', assigned_to: ''
};

export default function Leads() {
  const { user: currentUser } = useAuth();
  const isSales = currentUser?.role === 'sales';
  const isViewer = currentUser?.role === 'viewer';

  const [leads, setLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [salesUsers, setSalesUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ status: '', campaign_id: '', search: '' });

  const load = useCallback(() => {
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.campaign_id) params.campaign_id = filters.campaign_id;
    if (filters.search) params.search = filters.search;
    leadsAPI.getAll(params).then(r => setLeads(r.data)).finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    campaignsAPI.getAll().then(r => setCampaigns(r.data));
    if (!isSales && !isViewer) {
      leadsAPI.getSalesUsers().then(r => setSalesUsers(r.data)).catch(() => {});
    }
  }, [isSales, isViewer]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (l) => {
    setEditing(l);
    setForm({
      name: l.name || '', email: l.email || '', phone: l.phone || '',
      company: l.company || '', job_title: l.job_title || '',
      industry: l.industry || '', linkedin_url: l.linkedin_url || '',
      status: l.status || 'new', notes: l.notes || '',
      campaign_id: l.campaign_id || '', source: l.source || 'linkedin',
      assigned_to: l.assigned_to || '',
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await leadsAPI.update(editing.id, form);
        showToast('Lead updated successfully', 'success');
      } else {
        await leadsAPI.create(form);
        showToast('Lead added successfully', 'success');
      }
      setShowModal(false);
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this lead?')) return;
    try {
      await leadsAPI.delete(id);
      showToast('Lead deleted', 'success');
      load();
    } catch {
      showToast('Failed to delete lead', 'error');
    }
  };

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <Layout
      title="Leads"
      subtitle={isSales ? 'Your assigned leads' : 'Track and manage your collected leads'}
      actions={
        !isViewer
          ? <button className="btn btn-primary" onClick={openCreate}>+ Add Lead</button>
          : null
      }
    >
      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ padding: '16px 24px' }}>
          <div className="filter-row">
            <div className="search-bar">
              <span className="search-icon">🔍</span>
              <input
                placeholder="Search leads..."
                value={filters.search}
                onChange={e => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <select
              className="filter-select"
              value={filters.status}
              onChange={e => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Statuses</option>
              {STATUS_OPTS.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            {!isSales && (
              <select
                className="filter-select"
                value={filters.campaign_id}
                onChange={e => setFilters({ ...filters, campaign_id: e.target.value })}
              >
                <option value="">All Campaigns</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            {(filters.status || filters.campaign_id || filters.search) && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setFilters({ status: '', campaign_id: '', search: '' })}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <h3>{leads.length} Lead{leads.length !== 1 ? 's' : ''}</h3>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="empty-state"><div className="spinner" /></div>
          ) : leads.length === 0 ? (
            <div className="empty-state">
              <div className="icon">👥</div>
              <h3>No leads found</h3>
              <p>{isSales ? 'No leads assigned to you yet.' : 'Add leads manually or run a campaign.'}</p>
              {!isViewer && (
                <button className="btn btn-primary" onClick={openCreate}>Add Lead</button>
              )}
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Company / Title</th>
                    <th>Status</th>
                    {!isSales && <th>Campaign</th>}
                    {!isSales && <th>Assigned To</th>}
                    <th>Source</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map(l => (
                    <tr key={l.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{l.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.email}</div>
                        {l.phone && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.phone}</div>}
                      </td>
                      <td>
                        <div>{l.company || '-'}</div>
                        {l.job_title && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.job_title}</div>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${BADGE[l.status]}`}>{l.status}</span>
                      </td>
                      {!isSales && (
                        <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                          {l.campaign_name || '-'}
                        </td>
                      )}
                      {!isSales && (
                        <td style={{ fontSize: 13 }}>
                          {l.assigned_to_name
                            ? <span style={{ color: 'var(--success)', fontWeight: 500 }}>👤 {l.assigned_to_name}</span>
                            : <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                          }
                        </td>
                      )}
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{l.source}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                        {new Date(l.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="actions-cell">
                          {!isViewer && (
                            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(l)}>
                              {isSales ? 'Update' : 'Edit'}
                            </button>
                          )}
                          {!isViewer && !isSales && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(l.id)}>
                              Del
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? (isSales ? 'Update Lead' : 'Edit Lead') : 'Add Lead'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {isSales ? (
                  <>
                    <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
                      <div style={{ fontWeight: 600 }}>{editing?.name}</div>
                      <div style={{ color: 'var(--text-muted)' }}>{editing?.email}</div>
                    </div>
                    <div className="form-group">
                      <label>Status</label>
                      <select value={form.status} onChange={f('status')}>
                        {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Notes</label>
                      <textarea value={form.notes} onChange={f('notes')} placeholder="Add follow-up notes..." rows={5} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Full Name *</label>
                        <input value={form.name} onChange={f('name')} placeholder="Jane Doe" required />
                      </div>
                      <div className="form-group">
                        <label>Email *</label>
                        <input type="email" value={form.email} onChange={f('email')} placeholder="jane@company.com" required />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Phone</label>
                        <input value={form.phone} onChange={f('phone')} placeholder="+91 98765 43210" />
                      </div>
                      <div className="form-group">
                        <label>Company</label>
                        <input value={form.company} onChange={f('company')} placeholder="Acme Corp" />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Job Title</label>
                        <input value={form.job_title} onChange={f('job_title')} placeholder="Marketing Manager" />
                      </div>
                      <div className="form-group">
                        <label>Industry</label>
                        <input value={form.industry} onChange={f('industry')} placeholder="Technology" />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Status</label>
                        <select value={form.status} onChange={f('status')}>
                          {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Campaign</label>
                        <select value={form.campaign_id} onChange={f('campaign_id')}>
                          <option value="">None</option>
                          {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>LinkedIn URL</label>
                      <input value={form.linkedin_url} onChange={f('linkedin_url')} placeholder="https://linkedin.com/in/..." />
                    </div>
                    <div className="form-group">
                      <label>Assign To (Sales Person)</label>
                      <select value={form.assigned_to} onChange={f('assigned_to')}>
                        <option value="">Unassigned</option>
                        {salesUsers.map(u => (
                          <option key={u.id} value={u.id}>{u.name} — {u.email}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Notes</label>
                      <textarea value={form.notes} onChange={f('notes')} placeholder="Add notes about this lead..." rows={3} />
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editing ? (isSales ? 'Update Lead' : 'Save Changes') : 'Add Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}