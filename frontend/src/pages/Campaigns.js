import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import { campaignsAPI } from '../api';
import { linkedinAPI } from '../api';
import { showToast } from '../utils/toast';
import { useAuth } from '../context/AuthContext';

const STATUS_OPTS = ['draft', 'active', 'paused', 'completed'];
const BADGE = {
  draft: 'badge-draft',
  active: 'badge-active',
  paused: 'badge-paused',
  completed: 'badge-completed',
};

const AD_STATUS_BADGE = {
  draft: 'badge-draft',
  published: 'badge-active',
};

const AD_APPROVAL_BADGE = {
  draft: 'badge-draft',
  pending_approval: 'badge-contacted',
  approved: 'badge-active',
  rejected: 'badge-lost',
};

const emptyForm = {
  name: '', objective: '', industry: '', location: '',
  audience_size: '', budget: '', ad_copy: '', creative_url: '',
  start_date: '', end_date: '', status: 'draft',
};

// How many days until end_date
const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export default function Campaigns() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Campaign detail
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [campaignAds, setCampaignAds] = useState([]);
  const [adsLoading, setAdsLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const load = useCallback(() => {
    campaignsAPI.getAll()
      .then(r => setCampaigns(r.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (c) => {
    setSelectedCampaign(c);
    setShowDetail(true);
    setAdsLoading(true);
    try {
      const r = await campaignsAPI.getCampaignAds(c.id);
      setCampaignAds(r.data);
    } catch {
      setCampaignAds([]);
    } finally {
      setAdsLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setError('');
    setForm({
      name: c.name || '',
      objective: c.objective || '',
      industry: c.industry || '',
      location: c.location || '',
      audience_size: c.audience_size || '',
      budget: c.budget || '',
      ad_copy: c.ad_copy || '',
      creative_url: c.creative_url || '',
      start_date: c.start_date ? c.start_date.slice(0, 10) : '',
      end_date: c.end_date ? c.end_date.slice(0, 10) : '',
      status: c.status || 'draft',
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await campaignsAPI.update(editing.id, form);
        showToast('Campaign updated', 'success');
      } else {
        try {
          await linkedinAPI.createCampaign({
            name: form.name,
            objective: form.objective,
            budget: form.budget,
            start_date: form.start_date,
            end_date: form.end_date,
            account_id: process.env.REACT_APP_LINKEDIN_AD_ACCOUNT_ID,
          });
        } catch (liErr) {
          console.warn('LinkedIn campaign creation failed (continuing locally):', liErr.message);
        }
        await campaignsAPI.create(form);
        showToast('Campaign created', 'success');
      }
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
      showToast(err.response?.data?.error || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this campaign? This cannot be undone.')) return;
    try {
      await campaignsAPI.delete(id);
      showToast('Campaign deleted', 'success');
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Delete failed', 'error');
    }
  };

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  // Expiry warning label
  const expiryLabel = (c) => {
    if (c.status === 'completed') return null;
    if (!c.end_date) return null;
    const days = daysUntil(c.end_date);
    if (days < 0) return <span style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600 }}>Expired</span>;
    if (days === 0) return <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>Ends today</span>;
    if (days <= 3) return <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>Ends in {days}d</span>;
    return null;
  };

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
                    <th>Ads</th>
                    <th>Leads</th>
                    <th>Duration</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map(c => (
                    <tr
                      key={c.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => openDetail(c)}
                    >
                      <td>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        {c.owner_name && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>by {c.owner_name}</div>
                        )}
                        {expiryLabel(c)}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{c.objective || '-'}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{c.industry || '-'}</td>
                      <td>₹{Number(c.budget || 0).toLocaleString()}</td>
                      <td><span className={`badge ${BADGE[c.status]}`}>{c.status}</span></td>
                      <td>
                        <span style={{
                          fontWeight: 700, color: 'var(--primary)', fontSize: 15,
                        }}>
                          {c.ads_count || 0}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>
                          ad{c.ads_count !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td><strong>{c.leads_count || 0}</strong></td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {c.start_date ? new Date(c.start_date).toLocaleDateString() : '-'}
                        {c.end_date ? ` → ${new Date(c.end_date).toLocaleDateString()}` : ''}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="actions-cell">
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}>Edit</button>
                          {(isAdmin || c.user_id === user?.id) && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>Delete</button>
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

      {/* ── Campaign Detail Modal ── */}
      {showDetail && selectedCampaign && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div
            className="modal"
            style={{ maxWidth: 780, width: '95%' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 style={{ marginBottom: 4 }}>{selectedCampaign.name}</h2>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className={`badge ${BADGE[selectedCampaign.status]}`}>
                    {selectedCampaign.status}
                  </span>
                  {selectedCampaign.objective && (
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {selectedCampaign.objective}
                    </span>
                  )}
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowDetail(false)}>✕</button>
            </div>

            <div className="modal-body">
              {/* Campaign stats row */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 12, marginBottom: 24,
              }}>
                {[
                  { label: 'Budget', value: `₹${Number(selectedCampaign.budget || 0).toLocaleString()}` },
                  { label: 'Leads', value: selectedCampaign.leads_count || 0 },
                  { label: 'Total Ads', value: selectedCampaign.ads_count || 0 },
                  { label: 'Industry', value: selectedCampaign.industry || '-' },
                ].map(s => (
                  <div key={s.label} style={{
                    background: 'var(--bg)', borderRadius: 'var(--radius-sm)',
                    padding: '14px 16px', border: '1px solid var(--border)',
                  }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Dates + location */}
              <div style={{
                display: 'flex', gap: 20, flexWrap: 'wrap',
                fontSize: 13, color: 'var(--text-secondary)',
                marginBottom: 24, padding: '12px 16px',
                background: 'var(--bg)', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
              }}>
                {selectedCampaign.start_date && (
                  <span>📅 Start: <strong>{new Date(selectedCampaign.start_date).toLocaleDateString()}</strong></span>
                )}
                {selectedCampaign.end_date && (
                  <span>🏁 End: <strong>{new Date(selectedCampaign.end_date).toLocaleDateString()}</strong>
                    {daysUntil(selectedCampaign.end_date) !== null && selectedCampaign.status !== 'completed' && (
                      <span style={{
                        marginLeft: 6, fontSize: 11, fontWeight: 600,
                        color: daysUntil(selectedCampaign.end_date) <= 3 ? '#f59e0b' : 'var(--text-muted)',
                      }}>
                        ({daysUntil(selectedCampaign.end_date) < 0
                          ? 'expired'
                          : daysUntil(selectedCampaign.end_date) === 0
                          ? 'ends today'
                          : `${daysUntil(selectedCampaign.end_date)}d left`})
                      </span>
                    )}
                  </span>
                )}
                {selectedCampaign.location && (
                  <span>📍 <strong>{selectedCampaign.location}</strong></span>
                )}
              </div>

              {/* Ads under this campaign */}
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: 'var(--text-primary)' }}>
                  📢 Ads under this campaign
                </div>

                {adsLoading ? (
                  <div style={{ textAlign: 'center', padding: 32 }}>
                    <div className="spinner" />
                  </div>
                ) : campaignAds.length === 0 ? (
                  <div style={{
                    textAlign: 'center', padding: '32px 24px',
                    background: 'var(--bg)', borderRadius: 'var(--radius-sm)',
                    border: '1px dashed var(--border)',
                  }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                      No ads created for this campaign yet.
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      Go to <strong>Ads</strong> page and link an ad to this campaign.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {campaignAds.map(ad => (
                      <div key={ad.id} style={{
                        background: 'var(--bg)', borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)', padding: '14px 16px',
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: 'flex-start', gap: 16,
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                            {ad.title}
                          </div>
                          <div style={{
                            fontSize: 12, color: 'var(--text-muted)',
                            overflow: 'hidden', textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap', maxWidth: 380,
                          }}>
                            {ad.ad_copy}
                          </div>
                          {ad.creator_name && (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                              By {ad.creator_name}
                              {ad.template_name && ` · Template: ${ad.template_name}`}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                          <span className={`badge ${AD_STATUS_BADGE[ad.status] || 'badge-draft'}`}>
                            {ad.status}
                          </span>
                          <span className={`badge ${AD_APPROVAL_BADGE[ad.approval_status] || 'badge-draft'}`}>
                            {ad.approval_status || 'draft'}
                          </span>
                          {ad.published_at && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              Published {new Date(ad.published_at).toLocaleDateString()}
                            </span>
                          )}
                          {ad.external_ad_url && (
                            <a
                              href={ad.external_ad_url}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: 12 }}
                            >
                              👁️ View
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDetail(false)}>Close</button>
              <button className="btn btn-primary" onClick={() => { setShowDetail(false); openEdit(selectedCampaign); }}>
                Edit Campaign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create/Edit Modal ── */}
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

                {form.start_date && form.end_date && (
                  <div style={{
                    fontSize: 13, color: 'var(--text-secondary)',
                    background: 'var(--bg)', padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)', marginBottom: 16,
                    border: '1px solid var(--border)',
                  }}>
                    ℹ️ Status will auto-update based on dates:
                    draft → active on start date, active → completed after end date
                  </div>
                )}

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
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
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