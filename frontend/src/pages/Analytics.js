import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { analyticsAPI } from '../api';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#0a66c2', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    analyticsAPI.dashboard()
      .then(r => setData(r.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <Layout title="Analytics">
      <div className="empty-state"><div className="spinner" /></div>
    </Layout>
  );

  if (error) return (
    <Layout title="Analytics">
      <div className="empty-state"><p>Error loading analytics: {error}</p></div>
    </Layout>
  );

  if (!data) return (
    <Layout title="Analytics">
      <div className="empty-state"><p>No data available</p></div>
    </Layout>
  );

  const leadPieData = data?.leadStatusBreakdown?.map(l => ({
    name: l.status.charAt(0).toUpperCase() + l.status.slice(1),
    value: parseInt(l.count)
  })) || [];

  const campaignBarData = data?.recentCampaigns?.map(c => ({
    name: c.name.length > 14 ? c.name.slice(0, 14) + '…' : c.name,
    Leads: c.leads_count,
    Budget: Math.round(c.budget / 1000),
  })) || [];

  return (
    <Layout title="Analytics" subtitle="Campaign performance and lead insights">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">📊</div>
          <div className="stat-info">
            <div className="stat-value">{data?.stats?.totalCampaigns ?? 0}</div>
            <div className="stat-label">Total Campaigns</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div className="stat-info">
            <div className="stat-value">{data?.stats?.activeCampaigns ?? 0}</div>
            <div className="stat-label">Active Right Now</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber">👥</div>
          <div className="stat-info">
            <div className="stat-value">{data?.stats?.totalLeads ?? 0}</div>
            <div className="stat-label">Total Leads</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">🎯</div>
          <div className="stat-info">
            <div className="stat-value">
              {data?.stats?.totalLeads > 0
                ? Math.round(((data?.leadStatusBreakdown?.find(s => s.status === 'converted')?.count || 0) / data.stats.totalLeads) * 100)
                : 0}%
            </div>
            <div className="stat-label">Conversion Rate</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header"><h3>Lead Status Distribution</h3></div>
          <div className="card-body">
            {leadPieData.length === 0 ? (
              <div className="empty-state"><p>No lead data available</p></div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={leadPieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {leadPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Leads per Campaign</h3></div>
          <div className="card-body">
            {campaignBarData.length === 0 ? (
              <div className="empty-state"><p>No campaign data available</p></div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={campaignBarData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Leads" fill="#0a66c2" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card grid-full">
          <div className="card-header"><h3>Campaign Performance Table</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            {data?.recentCampaigns?.length === 0 ? (
              <div className="empty-state"><p>No campaigns to display</p></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Campaign</th>
                      <th>Status</th>
                      <th>Industry</th>
                      <th>Budget</th>
                      <th>Audience</th>
                      <th>Leads</th>
                      <th>Start</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentCampaigns.map(c => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 500 }}>{c.name}</td>
                        <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                        <td style={{ color: 'var(--text-secondary)' }}>{c.industry || '-'}</td>
                        <td>₹{Number(c.budget || 0).toLocaleString()}</td>
                        <td>{Number(c.audience_size || 0).toLocaleString()}</td>
                        <td><strong style={{ color: 'var(--primary)' }}>{c.leads_count}</strong></td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{c.start_date ? new Date(c.start_date).toLocaleDateString() : '-'}</td>
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
