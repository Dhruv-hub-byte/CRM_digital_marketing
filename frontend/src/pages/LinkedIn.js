import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { linkedinAPI } from '../api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';

const STATUS_BADGE = {
  ACTIVE: 'badge-active',
  PAUSED: 'badge-paused',
  COMPLETED: 'badge-completed',
};

export default function LinkedIn() {
  const [connected, setConnected] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    linkedinAPI.getStatus()
      .then(r => {
        setConnected(r.data.connected);
        if (r.data.connected) loadAccounts();
        else setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const r = await linkedinAPI.getAdAccounts();
      setAccounts(r.data);
      if (r.data.length > 0) {
        setSelectedAccount(r.data[0].id);
        await loadCampaignData(r.data[0].id);
      }
    } catch {
      setMsg('❌ Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const loadCampaignData = async (accountId) => {
    try {
      const [camps, anal] = await Promise.all([
        linkedinAPI.getCampaigns(accountId),
        linkedinAPI.getAnalytics(accountId),
      ]);
      setCampaigns(camps.data);
      setAnalytics(anal.data);
    } catch {
      setMsg('❌ Failed to load campaign data');
    }
  };

  const handleConnect = async () => {
    setConnecting(true); setMsg('');
    try {
      await linkedinAPI.connect();
      setConnected(true);
      setMsg('✅ LinkedIn connected successfully');
      await loadAccounts();
    } catch {
      setMsg('❌ Connection failed. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect LinkedIn? This will remove all synced data.')) return;
    try {
      await linkedinAPI.disconnect();
      setConnected(false);
      setAccounts([]);
      setCampaigns([]);
      setAnalytics([]);
      setSelectedAccount(null);
      setMsg('LinkedIn disconnected');
    } catch {
      setMsg('❌ Failed to disconnect');
    }
  };

  const handleAccountChange = async (accountId) => {
    setSelectedAccount(accountId);
    setLoading(true);
    await loadCampaignData(accountId);
    setLoading(false);
  };

  const totalImpressions = analytics.reduce((s, r) => s + (r.impressions || 0), 0);
  const totalClicks = analytics.reduce((s, r) => s + (r.clicks || 0), 0);
  const totalLeads = analytics.reduce((s, r) => s + (r.leads || 0), 0);
  const totalCost = analytics.reduce((s, r) => s + (r.cost || 0), 0);

  return (
    <Layout
      title="LinkedIn Ads"
      subtitle="Connect and manage your LinkedIn advertising campaigns"
      actions={
        connected
          ? <button className="btn btn-danger btn-sm" onClick={handleDisconnect}>Disconnect</button>
          : null
      }
    >
      {msg && (
        <div
          className={`alert ${msg.startsWith('✅') ? 'alert-success' : msg.startsWith('❌') ? 'alert-error' : 'alert-info'}`}
          style={{ marginBottom: 20 }}
        >
          {msg}
        </div>
      )}

      {/* Not connected */}
      {!connected && !loading && (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '80px 40px' }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>🔗</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginBottom: 12 }}>
              Connect LinkedIn Ads
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15, maxWidth: 500, margin: '0 auto 32px' }}>
              Connect your LinkedIn Ads account to sync campaigns, track performance,
              and view real-time analytics directly in your CRM.
            </p>

            <div style={{
              display: 'flex', gap: 12, justifyContent: 'center',
              flexWrap: 'wrap', marginBottom: 40
            }}>
              {[
                '✓ Sync ad campaigns',
                '✓ Track impressions & clicks',
                '✓ Monitor lead generation',
                '✓ View spend analytics'
              ].map(f => (
                <div key={f} style={{
                  background: '#e8f4fd', color: 'var(--primary)',
                  padding: '8px 16px', borderRadius: 100,
                  fontSize: 13, fontWeight: 500
                }}>
                  {f}
                </div>
              ))}
            </div>

            <button
              className="btn btn-primary btn-lg"
              onClick={handleConnect}
              disabled={connecting}
              style={{ background: '#0a66c2', minWidth: 240 }}
            >
              {connecting ? 'Connecting...' : '🔗 Connect LinkedIn Account'}
            </button>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
              Demo mode — uses simulated LinkedIn data
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="empty-state">
          <div className="spinner" />
        </div>
      )}

      {/* Connected */}
      {connected && !loading && (
        <>
          {/* Account selector bar */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-body" style={{
              padding: '16px 24px',
              display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap'
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: 'var(--success)', flexShrink: 0
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>LinkedIn Ads Connected</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Showing demo data for developer preview
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Ad Account:
                </label>
                <select
                  className="filter-select"
                  value={selectedAccount || ''}
                  onChange={e => handleAccountChange(e.target.value)}
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            {[
              { label: 'Total Impressions', value: totalImpressions.toLocaleString(), icon: '👁️', color: 'blue' },
              { label: 'Total Clicks', value: totalClicks.toLocaleString(), icon: '🖱️', color: 'green' },
              { label: 'Leads Generated', value: totalLeads.toLocaleString(), icon: '🎯', color: 'amber' },
              { label: 'Total Spend', value: '$' + totalCost.toLocaleString(), icon: '💰', color: 'purple' },
            ].map(s => (
              <div className="stat-card" key={s.label}>
                <div className={`stat-icon ${s.color}`}>{s.icon}</div>
                <div className="stat-info">
                  <div className="stat-value">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="dashboard-grid" style={{ marginBottom: 24 }}>
            <div className="card">
              <div className="card-header"><h3>Impressions & Clicks by Month</h3></div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={analytics}>
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="impressions" fill="#0a66c2" radius={[4, 4, 0, 0]} name="Impressions" />
                    <Bar dataKey="clicks" fill="#10b981" radius={[4, 4, 0, 0]} name="Clicks" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3>Leads & Spend Trend</h3></div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={analytics}>
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="leads" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="Leads" />
                    <Line type="monotone" dataKey="cost" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} name="Spend ($)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Campaigns table */}
          <div className="card">
            <div className="card-header">
              <h3>LinkedIn Campaigns ({campaigns.length})</h3>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {campaigns.length === 0 ? (
                <div className="empty-state">
                  <div className="icon">📣</div>
                  <p>No campaigns found for this account</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Campaign Name</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Budget</th>
                        <th>Impressions</th>
                        <th>Clicks</th>
                        <th>Leads</th>
                        <th>CTR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map(c => (
                        <tr key={c.id}>
                          <td style={{ fontWeight: 500 }}>{c.name}</td>
                          <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            {c.type?.replace(/_/g, ' ')}
                          </td>
                          <td>
                            <span className={`badge ${STATUS_BADGE[c.status] || 'badge-draft'}`}>
                              {c.status}
                            </span>
                          </td>
                          <td>${Number(c.budget || 0).toLocaleString()}</td>
                          <td>{Number(c.impressions || 0).toLocaleString()}</td>
                          <td>{Number(c.clicks || 0).toLocaleString()}</td>
                          <td>
                            <strong style={{ color: 'var(--primary)' }}>{c.leads}</strong>
                          </td>
                          <td>
                            {c.impressions > 0
                              ? ((c.clicks / c.impressions) * 100).toFixed(2) + '%'
                              : '0%'
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}