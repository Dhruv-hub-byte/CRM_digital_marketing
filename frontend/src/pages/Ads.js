import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { adsAPI } from '../api';
import { useAuth } from '../context/AuthContext';

const STATUS_BADGE = {
  draft: 'badge-draft',
  published: 'badge-active',
};

export default function Ads() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

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
    status: 'draft',
  });

  const [generating, setGenerating] = useState(false);
  const [genVariables, setGenVariables] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    load();
    adsAPI.getTemplates().then(r => setTemplates(r.data));
  }, []);

  const load = () => {
    adsAPI.getAll()
      .then(r => setAds(r.data))
      .finally(() => setLoading(false));
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ template_id: '', title: '', ad_copy: '', loom_url: '', status: 'draft' });
    setGenVariables({});
    setError('');
    setShowModal(true);
  };

  const openEdit = (ad) => {
    setEditing(ad);
    setForm({
      template_id: ad.template_id || '',
      title: ad.title,
      ad_copy: ad.ad_copy,
      loom_url: ad.loom_url || '',
      status: ad.status,
    });
    setError('');
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
      setForm({ ...form, ad_copy: res.data.ad_copy });
      setSuccess('✅ Copy generated with ChatGPT');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('❌ ' + (err.response?.data?.error || 'Generation failed. Check OpenAI API key.'));
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title || !form.ad_copy) return setError('Title and copy required');

    try {
      if (editing) {
        await adsAPI.update(editing.id, form);
      } else {
        await adsAPI.create(form);
      }
      setShowModal(false);
      load();
      setSuccess('✅ Saved successfully');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError('❌ ' + (err.response?.data?.error || 'Save failed'));
    }
  };

  const handlePublish = async (id) => {
    if (!window.confirm('Publish this ad?')) return;
    try {
      await adsAPI.publish(id);
      load();
      setSuccess('✅ Ad published');
    } catch (err) {
      setError('❌ Publish failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this ad?')) return;
    await adsAPI.delete(id);
    load();
  };

  const selectedTemplate = templates.find(t => t.id === parseInt(form.template_id));

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <Layout
      title="Marketing Ads"
      subtitle={isAdmin ? 'View all ads created by your team' : 'Create and publish LinkedIn ads'}
      actions={!isAdmin ? <button className="btn btn-primary" onClick={openCreate}>+ Create Ad</button> : null}
    >
      {success && <div className="alert alert-success" style={{ marginBottom: 20 }}>{success}</div>}

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
              <p>{isAdmin ? 'Your team hasn\'t created any ads yet.' : 'Create your first marketing ad.'}</p>
              {!isAdmin && <button className="btn btn-primary" onClick={openCreate}>Create Ad</button>}
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Creator</th>
                    <th>Template</th>
                    <th>Status</th>
                    <th>Published</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ads.map(ad => (
                    <tr key={ad.id}>
                      <td style={{ fontWeight: 600 }}>{ad.title}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{ad.creator_name || 'System'}</td>
                      <td style={{ fontSize: 13 }}>{ad.template_name || '-'}</td>
                      <td><span className={`badge ${STATUS_BADGE[ad.status]}`}>{ad.status}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {ad.published_at ? new Date(ad.published_at).toLocaleDateString() : '-'}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(ad.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="actions-cell">
                          {!isAdmin && ad.status === 'draft' && (
                            <>
                              <button className="btn btn-secondary btn-sm" onClick={() => openEdit(ad)}>Edit</button>
                              <button className="btn btn-success btn-sm" onClick={() => handlePublish(ad.id)}>Publish</button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(ad.id)}>Del</button>
                            </>
                          )}
                          {isAdmin && (
                            <button className="btn btn-secondary btn-sm" onClick={() => window.location.href = `/ads/${ad.id}`}>View</button>
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

                <div className="form-group">
                  <label>Title *</label>
                  <input value={form.title} onChange={f('title')} placeholder="Q2 Lead Gen Campaign" required />
                </div>

                <div className="form-group">
                  <label>Template</label>
                  <select value={form.template_id} onChange={f('template_id')}>
                    <option value="">Select a template...</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                {selectedTemplate && (
                  <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 'var(--radius-sm)', marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Fill template variables:</div>
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
                      {generating ? '✨ Generating...' : '✨ Generate with ChatGPT'}
                    </button>
                  </div>
                )}

                <div className="form-group">
                  <label>Ad Copy *</label>
                  <textarea
                    value={form.ad_copy}
                    onChange={f('ad_copy')}
                    placeholder="Your ad copy here (generated or custom)..."
                    rows={6}
                    required
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>Max 150 words for LinkedIn</small>
                </div>

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
                        src={form.loom_url.replace('share', 'embed')}
                        style={{ width: '100%', height: 300, border: 'none' }}
                        allowFullScreen
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
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