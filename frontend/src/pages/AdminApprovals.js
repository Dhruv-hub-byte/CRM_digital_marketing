import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { adsAPI } from '../api';
import { showToast } from '../utils/toast';

export default function AdminApprovals() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectingId, setRejectingId] = useState(null);

  const load = () => {
    adsAPI.getPending()
      .then(r => setPending(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id, title) => {
    if (!window.confirm(`Approve "${title}"? It will publish immediately.`)) return;
    try {
      await adsAPI.approve(id);
      showToast('Ad approved and published', 'success');
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Approve failed', 'error');
    }
  };

  const handleReject = async (id) => {
    if (!rejectNote.trim()) return showToast('Add a rejection reason', 'error');
    try {
      await adsAPI.reject(id, rejectNote);
      showToast('Ad rejected', 'info');
      setRejectingId(null);
      setRejectNote('');
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Reject failed', 'error');
    }
  };

  return (
    <Layout title="Ad Approvals" subtitle="Review and approve ads submitted by your team">
      <div className="card">
        <div className="card-header">
          <h3>Pending Approval ({pending.length})</h3>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="empty-state"><div className="spinner" /></div>
          ) : pending.length === 0 ? (
            <div className="empty-state">
              <div className="icon">✅</div>
              <h3>No pending approvals</h3>
              <p>All ads have been reviewed.</p>
            </div>
          ) : (
            pending.map(ad => (
              <div key={ad.id} style={{
                padding: 24, borderBottom: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{ad.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                      By {ad.creator_name} · Campaign: {ad.campaign_name || 'None'} · {new Date(ad.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="badge badge-contacted">Pending</span>
                </div>

                <div style={{
                  background: 'var(--bg)', padding: 16,
                  borderRadius: 'var(--radius-sm)', marginBottom: 16,
                  fontSize: 14, lineHeight: 1.6,
                }}>
                  {ad.ad_copy}
                </div>

                {ad.loom_url && (
                  <div style={{ marginBottom: 16 }}>
                    <iframe
                      src={ad.loom_url.replace('/share/', '/embed/')}
                      style={{ width: '100%', height: 240, border: 'none', borderRadius: 8 }}
                      allowFullScreen
                      title="Loom video"
                    />
                  </div>
                )}

                {ad.external_ad_url && (
                  <div style={{ marginBottom: 16 }}>
                    <a href={ad.external_ad_url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                      👁️ View External Ad
                    </a>
                  </div>
                )}

                {rejectingId === ad.id ? (
                  <div>
                    <div className="form-group">
                      <label>Rejection reason (sent to creator)</label>
                      <textarea
                        value={rejectNote}
                        onChange={e => setRejectNote(e.target.value)}
                        placeholder="Explain why this ad is rejected..."
                        rows={3}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button className="btn btn-danger" onClick={() => handleReject(ad.id)}>
                        Confirm Reject
                      </button>
                      <button className="btn btn-secondary" onClick={() => { setRejectingId(null); setRejectNote(''); }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-success" onClick={() => handleApprove(ad.id, ad.title)}>
                      ✅ Approve & Publish
                    </button>
                    <button className="btn btn-danger" onClick={() => setRejectingId(ad.id)}>
                      ❌ Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}