import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import { adsAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { linkedinAPI } from '../api';
import { showToast } from '../utils/toast';
import { campaignsAPI } from '../api';



const STATUS_BADGE = {
  draft: 'badge-draft',
  published: 'badge-active',
};


const APPROVAL_BADGE = {
  draft: 'badge-draft',
  pending_approval: 'badge-contacted',
  approved: 'badge-active',
  rejected: 'badge-lost',
};

const EXTERNAL_TOOLS = [
  { name: 'Canva', url: 'https://canva.com/create/ads', icon: '🎨', desc: 'Design visual ads' },
  { name: 'AdCreative.ai', url: 'https://adcreative.ai', icon: '🤖', desc: 'AI ad creatives' },
  { name: 'Meta Ads', url: 'https://www.facebook.com/adsmanager', icon: '📘', desc: 'Facebook & Instagram' },
  { name: 'Google Ads', url: 'https://ads.google.com', icon: '🔍', desc: 'Search & display' },
  { name: 'LinkedIn Ads', url: 'https://www.linkedin.com/campaignmanager', icon: '💼', desc: 'LinkedIn campaigns' },
];

const emptyForm = {
  template_id: '',
  title: '',
  ad_copy: '',
  loom_url: '',
  external_ad_url: '',
  status: 'draft',
  campaign_id: '',
};

export default function Ads() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isSales = user?.role === 'sales';

  const [ads, setAds] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
  template_id: '',
  title: '',
  ad_copy: '',
  loom_url: '',
  external_ad_url: '',
  status: 'draft',
  campaign_id: '',   // ← ADD THIS
});
  const [generating, setGenerating] = useState(false);
  const [genVariables, setGenVariables] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [allCampaigns, setAllCampaigns] = useState([]);



  useEffect(() => {
    load();
    adsAPI.getTemplates().then(r => setTemplates(r.data));
    campaignsAPI.getAll().then(r => {
      const campaigns = r.data;
      if (isSales) {
        setAllCampaigns(campaigns.filter(c => c.status === 'active'));
      } else {
        setAllCampaigns(campaigns);
      }
    });
  }, [isSales]);


  const load = () => {
    adsAPI.getAll()
      .then(r => setAds(r.data))
      .finally(() => setLoading(false));
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ template_id: '', title: '', ad_copy: '', loom_url: '', external_ad_url: '', status: 'draft' });
    setGenVariables({});
    showToast('Something went wrong', 'error');
    setShowModal(true);
  };

  const openEdit = (ad) => {
    setEditing(ad);
    setForm({
      template_id: ad.template_id || '',
      title: ad.title,
      ad_copy: ad.ad_copy,
      loom_url: ad.loom_url || '',
      external_ad_url: ad.external_ad_url || '',
      status: ad.status,
      campaign_id: ad.campaign_id || '',
    });
    setShowModal(true);
  };

  const generateCopy = async () => {
    if (!form.template_id) return setError('Select a template first');
    setGenerating(true); 
    try {
      const res = await adsAPI.generateCopy({
        template_id: parseInt(form.template_id),
        variables: genVariables,
      });
      setForm(prev => ({ ...prev, ad_copy: res.data.ad_copy }));
      showToast('Copy generated with AI', 'success');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('❌ ' + (err.response?.data?.error || 'Generation failed. Check API key.'));
    } finally {
      setGenerating(false);
    }
  };

   const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title || !form.ad_copy) return showToast('Title and copy are required', 'error');
    try {
      if (editing) {
        await adsAPI.update(editing.id, form);
        showToast('Ad updated successfully', 'success');
      } else {
        await adsAPI.create(form);
        showToast('Ad created successfully', 'success');
      }
      setShowModal(false);
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Save failed', 'error');
    }
  };

  const handlePublish = async (id) => {
    if (!window.confirm('Publish this ad to LinkedIn?')) return;
    try {
      const ad = ads.find(a => a.id === id);
      if (!ad) return;
      const liRes = await linkedinAPI.publishAd({
        ad_copy: ad.ad_copy,
        loom_url: ad.loom_url || null,
        campaign_id: id,
      });
      await adsAPI.publish(id);
      load();
      showToast('Ad published to LinkedIn', 'success');
      if (liRes.data.linkedin_post_url) {
        window.open(liRes.data.linkedin_post_url, '_blank');
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Publish failed', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this ad?')) return;
    try {
      await adsAPI.delete(id);
      showToast('Ad deleted', 'success');
      load();
    } catch {
      showToast('Delete failed', 'error');
    }
  };

  const handleSubmit = async (id) => {
    if (!window.confirm('Submit this ad for admin approval?')) return;
    try {
      await adsAPI.submit(id);
      showToast('Ad submitted for approval', 'info');
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Submit failed', 'error');
    }
  };

  const selectedTemplate = templates.find(t => t.id === parseInt(form.template_id));
  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const getCampaignName = (campaignId) => {
    if (!campaignId) return '-';
    const c = allCampaigns.find(c => c.id === parseInt(campaignId));
    return c?.name || `Campaign #${campaignId}`;
  };

  return (
    <Layout
      title="Marketing Ads"
      subtitle={isAdmin ? 'View all ads created by your team' : 'Create and publish LinkedIn ads'}
      actions={!isAdmin ? <button className="btn btn-primary" onClick={openCreate}>+ Create Ad</button> : null}
    >
      {success && <div className="alert alert-success" style={{ marginBottom: 20 }}>{success}</div>}
      {error && !showModal && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

      <div className="card">
        <div className="card-header">
          <h3>{ads.length} Ad{ads.length !== 1 ? 's' : ''}</h3>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="empty-state"><div className="spinner" /></div>
          ) : ads.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📢</div>
              <h3>No ads yet</h3>
              <p>{isAdmin ? "Your team hasn't created any ads yet." : 'Create your first marketing ad.'}</p>
              {!isAdmin && <button className="btn btn-primary" onClick={openCreate}>Create Ad</button>}
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Campaign</th>
                    <th>Creator</th>
                    <th>Template</th>
                    <th>Status</th>
                    <th>Approval</th>
                    <th>External Ad</th>
                    <th>Published</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ads.map(ad => (
                    <tr key={ad.id}>
                      <td style={{ fontWeight: 600 }}>{ad.title}</td>
                      <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {ad.campaign_name || getCampaignName(ad.campaign_id)}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{ad.creator_name || 'System'}</td>
                      <td style={{ fontSize: 13 }}>{ad.template_name || '-'}</td>
                      <td><span className={`badge ${STATUS_BADGE[ad.status] || 'badge-draft'}`}>{ad.status}</span></td>
                      <td>
                        <span className={`badge ${APPROVAL_BADGE[ad.approval_status] || 'badge-draft'}`}>
                          {ad.approval_status || 'draft'}
                        </span>
                      </td>
                      <td>
                        {ad.external_ad_url ? (
                          <a
                            href={ad.external_ad_url}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary btn-sm"
                          >
                            👁️ View
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>None</span>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {ad.published_at ? new Date(ad.published_at).toLocaleDateString() : '-'}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(ad.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="actions-cell">
                          {!isAdmin && (
                            <>
                              {(ad.approval_status === 'draft' || !ad.approval_status) && (
                                <>
                                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(ad)}>Edit</button>
                                  <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => handleSubmit(ad.id)}
                                  >
                                    Submit
                                  </button>
                                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(ad.id)}>Del</button>
                                </>
                              )}
                              {ad.approval_status === 'pending_approval' && (
                                <span style={{ fontSize: 12, color: 'var(--warning)', fontWeight: 500 }}>⏳ Pending</span>
                              )}
                              {ad.approval_status === 'approved' && (
                                <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 500 }}>✅ Approved</span>
                              )}
                              {ad.approval_status === 'rejected' && (
                                <>
                                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(ad)}>Fix</button>
                                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(ad.id)}>Del</button>
                                </>
                              )}

                            </>
                          )}
                          {isAdmin && (
                            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(ad)}>View</button>
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
              <h2>{editing ? 'Edit Ad' : 'Create Ad'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}

                {/* Title */}
                <div className="form-group">
                  <label>Title *</label>
                  <input value={form.title} onChange={f('title')} placeholder="Q2 Lead Gen Campaign" required />
                </div>

                <div className="form-group">
                  <label>
                    Link to Campaign
                    {isSales && (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
                        (active campaigns only)
                      </span>
                    )}
                  </label>
                  {allCampaigns.length === 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--danger)', padding: '8px 12px', background: '#fee2e2', borderRadius: 6 }}>
                      {isSales
                        ? 'No active campaigns. Ask admin to activate one first.'
                        : 'No campaigns yet. Create a campaign first.'}
                    </div>
                  ) : (
                    <select value={form.campaign_id} onChange={f('campaign_id')}>
                      <option value="">Select campaign...</option>
                      {allCampaigns.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.status !== 'active' ? `(${c.status})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Template picker */}
                <div className="form-group">
                  <label>Template</label>
                  <select value={form.template_id} onChange={f('template_id')}>
                    <option value="">Select a template...</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                {selectedTemplate && (
                  <div style={{
                    background: 'var(--bg)', padding: 14,
                    borderRadius: 'var(--radius-sm)', marginBottom: 16,
                    border: '1px solid var(--border)'
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: 'var(--text-secondary)' }}>
                      FILL TEMPLATE VARIABLES
                    </div>
                    {selectedTemplate.placeholders.map(placeholder => (
                      <div key={placeholder} className="form-group" style={{ marginBottom: 8 }}>
                        <label style={{ fontSize: 13 }}>{placeholder}</label>
                        <input
                          value={genVariables[placeholder] || ''}
                          onChange={(e) => setGenVariables({ ...genVariables, [placeholder]: e.target.value })}
                          placeholder={`Enter ${placeholder.toLowerCase()}`}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={generateCopy}
                      disabled={generating}
                    >
                      {generating ? '⏳ Generating...' : '✨ Generate with AI'}
                    </button>
                  </div>
                )}

                {/* Ad copy */}
                <div className="form-group">
                  <label>Ad Copy *</label>
                  <textarea
                    value={form.ad_copy}
                    onChange={f('ad_copy')}
                    placeholder="Your ad copy here — generated or written manually..."
                    rows={6}
                    required
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    Max 150 words for LinkedIn
                  </small>
                </div>

                {/* Loom */}
                <div className="form-group">
                  <label>Loom Video URL (optional)</label>
                  <input
                    value={form.loom_url}
                    onChange={f('loom_url')}
                    placeholder="https://loom.com/share/..."
                    type="url"
                  />
                  {form.loom_url && (
                    <div style={{ marginTop: 8, borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                      <iframe
                        src={form.loom_url.replace('/share/', '/embed/')}
                        style={{ width: '100%', height: 280, border: 'none' }}
                        allowFullScreen
                        title="Loom preview"
                      />
                    </div>
                  )}
                </div>

                {/* External tools */}
                <div style={{
                  padding: 16,
                  background: 'var(--bg)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px dashed var(--border)',
                  marginBottom: 16,
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>
                    🛠️ Create ad using external tools
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
                    Click a tool → make your ad there → paste the link below
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                    {EXTERNAL_TOOLS.map(tool => (
                      <a
                        key={tool.name}
                        href={tool.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          padding: '10px 14px',
                          background: 'white',
                          border: '1.5px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          textDecoration: 'none',
                          color: 'var(--text-primary)',
                          fontSize: 12,
                          fontWeight: 500,
                          minWidth: 88,
                          transition: 'border-color 0.2s',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                      >
                        <span style={{ fontSize: 22, marginBottom: 4 }}>{tool.icon}</span>
                        <span>{tool.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{tool.desc}</span>
                      </a>
                    ))}
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Paste your finished ad link here</label>
                    <input
                      value={form.external_ad_url || ''}
                      onChange={f('external_ad_url')}
                      placeholder="https://canva.com/design/your-ad-link..."
                      type="url"
                    />
                    {form.external_ad_url && (
                      <div style={{ marginTop: 8 }}>
                        <a
                          href={form.external_ad_url}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary btn-sm"
                        >
                          👁️ Preview link
                        </a>
                      </div>
                    )}
                  </div>
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editing ? 'Update Ad' : 'Create Ad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}