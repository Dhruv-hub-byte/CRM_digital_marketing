import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { analyticsAPI } from '../api';
import { useAuth } from '../context/AuthContext';

const STATUS_BADGE = {
  new: 'badge-new', contacted: 'badge-contacted',
  qualified: 'badge-qualified', converted: 'badge-converted', lost: 'badge-lost',
};

const CAMPAIGN_BADGE = {
  draft: 'badge-draft', active: 'badge-active',
  paused: 'badge-paused', completed: 'badge-completed',
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    analyticsAPI.dashboard()
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="app-layout">
      <div className="loading-screen"><div className="spinner" /></div>
    </div>
  );

  if (!data) {
    return (
      <Layout title="Dashboard" subtitle="Unable to load dashboard data">
        <div className="empty-state" style={{ textAlign: 'center', padding: '40px' }}>
          <div className="icon" style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
          <p style={{ fontSize: '16px', marginBottom: '20px' }}>Unable to load your dashboard data. Please refresh the page.</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Refresh</button>
        </div>
      </Layout>
    );
  }

  const stats = data?.stats || {};

  return (
    <Layout title={`Welcome back, ${user?.name?.split(' ')[0]} 👋`} subtitle="Here's what's happening with your campaigns">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">📣</div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalCampaigns ?? 0}</div>
            <div className="stat-label">Total Campaigns</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div className="stat-info">
            <div className="stat-value">{stats.activeCampaigns ?? 0}</div>
            <div className="stat-label">Active Campaigns</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber">👥</div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalLeads ?? 0}</div>
            <div className="stat-label">Total Leads</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">🎯</div>
          <div className="stat-info">
            <div className="stat-value">
              {data?.leadStatusBreakdown?.find(s => s.status === 'converted')?.count ?? 0}
            </div>
            <div className="stat-label">Converted Leads</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Lead Status Breakdown */}
        <div className="card">
          <div className="card-header">
            <h3>Lead Status Breakdown</h3>
          </div>
          <div className="card-body">
            {data?.leadStatusBreakdown?.length === 0 ? (
              <div className="empty-state">
                <div className="icon">📭</div>
                <p>No leads yet</p>
              </div>
            ) : (
              data?.leadStatusBreakdown?.map(item => (
                <div key={item.status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span className={`badge ${STATUS_BADGE[item.status] || 'badge-new'}`}>{item.status}</span>
                  <div style={{ flex: 1, margin: '0 16px', height: 8, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, (item.count / (stats.totalLeads || 1)) * 100)}%`,
                      background: 'var(--primary)',
                      borderRadius: 4,
                    }} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', minWidth: 30 }}>{item.count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Campaigns */}
        <div className="card">
          <div className="card-header">
            <h3>Recent Campaigns</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/campaigns')}>View all</button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {data?.recentCampaigns?.length === 0 ? (
              <div className="empty-state">
                <div className="icon">📣</div>
                <p>No campaigns yet</p>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/campaigns')}>Create campaign</button>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Status</th>
                      <th>Leads</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.recentCampaigns?.map(c => (
                      <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/campaigns`)}>
                        <td style={{ fontWeight: 500 }}>{c.name}</td>
                        <td><span className={`badge ${CAMPAIGN_BADGE[c.status] || 'badge-draft'}`}>{c.status}</span></td>
                        <td>{c.leads_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Recent Leads */}
        <div className="card grid-full">
          <div className="card-header">
            <h3>Recent Leads</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/leads')}>View all</button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {data?.recentLeads?.length === 0 ? (
              <div className="empty-state">
                <div className="icon">👥</div>
                <p>No leads yet. Run a campaign to start collecting leads.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Company</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Campaign</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.recentLeads?.map(l => (
                      <tr key={l.id} style={{ cursor: 'pointer' }} onClick={() => navigate('/leads')}>
                        <td style={{ fontWeight: 500 }}>{l.name}</td>
                        <td>{l.company || '-'}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{l.email}</td>
                        <td><span className={`badge ${STATUS_BADGE[l.status] || 'badge-new'}`}>{l.status}</span></td>
                        <td style={{ color: 'var(--text-secondary)' }}>{l.campaign_name || '-'}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{new Date(l.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
