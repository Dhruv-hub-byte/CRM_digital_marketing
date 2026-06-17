import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { campaignsAPI } from '../api';
import { linkedinAPI } from '../api';
import useToastContext from '../hooks/useToastContext';

const STATUS_OPTS = ['draft', 'active', 'paused', 'completed'];
const BADGE = { draft: 'badge-draft', active: 'badge-active', paused: 'badge-paused', completed: 'badge-completed' };

const emptyForm = {
  name: '', objective: '', industry: '', location: '',
  audience_size: '', budget: '', ad_copy: '', start_date: '', end_date: '', status: 'draft'
};

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const showToast = useToastContext();

  const load = () => {
    campaignsAPI.getAll().then(r => setCampaigns(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); showToast('Something went wrong', 'error'); setShowModal(true); };
  const openEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name || '', objective: c.objective || '', industry: c.industry || '',
      location: c.location || '', audience_size: c.audience_size || '',
      budget: c.budget || '', ad_copy: c.ad_copy || '',
      start_date: c.start_date ? c.start_date.slice(0, 10) : '',
      end_date: c.end_date ? c.end_date.slice(0, 10) : '',
      status: c.status || 'draft',
    });
   showToast('Something went wrong', 'error');
    setShowModal(true);
  };

const handleSave = async (e) => {
  e.preventDefault();
  setSaving(true); showToast('Something went wrong', 'error');
  try {
    if (editing) {
      await campaignsAPI.update(editing.id, form);
    } else {
      // Try to create on LinkedIn too
      try {
        await linkedinAPI.createCampaign({
          name: form.name,
          objective: form.objective,
          budget: form.budget,
          start_date: form.start_date,
          end_date: form.end_date,
          account_id: '547650018',
        });
      } catch (liErr) {
        console.warn('LinkedIn campaign creation failed:', liErr.message);
        // Still save locally even if LinkedIn fails
      }
      await campaignsAPI.create(form);
    }
    setShowModal(false);
    load();
  } catch (err) {
    setError(err.response?.data?.error || 'Save failed');
    showToast('Something went wrong', 'error')
  } finally {
    setSaving(false);
  }
};

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this campaign?')) return;
    await campaignsAPI.delete(id);
    load();
  };

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <Layout
      title="Campaigns"
      subtitle="Manage your LinkedIn marketing campaigns"
      actions={<button className="btn btn-primary" onClick={openCreate}>+ New Campaign</button>}
    >
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="empty-state"><div className="spinner" /></div>
          ) : campaigns.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📣</div>
              <h3>No campaigns yet</h3>
              <p>Create your first LinkedIn campaign to start generating leads.</p>
              <button className="btn btn-primary" onClick={openCreate}>Create Campaign</button>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Campaign Name</th>
                    <th>Objective</th>
                    <th>Industry</th>
                    <th>Budget</th>
                    <th>Status</th>
                    <th>Leads</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map(c => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        {c.owner_name && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>by {c.owner_name}</div>}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{c.objective || '-'}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{c.industry || '-'}</td>
                      <td>₹{Number(c.budget || 0).toLocaleString()}</td>
                      <td><span className={`badge ${BADGE[c.status]}`}>{c.status}</span></td>
                      <td><strong>{c.leads_count}</strong></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{new Date(c.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className="actions-cell">
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>Delete</button>
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

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Campaign' : 'New Campaign'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <div className="form-group">
                  <label>Campaign Name *</label>
                  <input value={form.name} onChange={f('name')} placeholder="Q4 Lead Gen Campaign" required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Objective</label>
                    <select value={form.objective} onChange={f('objective')}>
                      <option value="">Select objective</option>
                      <option>Lead Generation</option>
                      <option>Brand Awareness</option>
                      <option>Website Traffic</option>
                      <option>Engagement</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select value={form.status} onChange={f('status')}>
                      {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Industry</label>
                    <input value={form.industry} onChange={f('industry')} placeholder="Technology, Finance..." />
                  </div>
                  <div className="form-group">
                    <label>Location</label>
                    <input value={form.location} onChange={f('location')} placeholder="India, US, Global" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Budget (₹)</label>
                    <input type="number" value={form.budget} onChange={f('budget')} placeholder="50000" />
                  </div>
                  <div className="form-group">
                    <label>Audience Size</label>
                    <input type="number" value={form.audience_size} onChange={f('audience_size')} placeholder="10000" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Date</label>
                    <input type="date" value={form.start_date} onChange={f('start_date')} />
                  </div>
                  <div className="form-group">
                    <label>End Date</label>
                    <input type="date" value={form.end_date} onChange={f('end_date')} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Ad Copy</label>
                  <textarea value={form.ad_copy} onChange={f('ad_copy')} placeholder="Write your ad content here..." rows={4} />
                </div>
                <div className="form-group">
                  <label>Creative URL</label>
                  <input value={form.creative_url} onChange={f('creative_url')} placeholder="https://..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editing ? 'Update Campaign' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
