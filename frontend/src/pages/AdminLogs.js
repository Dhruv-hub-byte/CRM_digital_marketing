import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { adminAPI } from '../api';

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getLogs().then(r => setLogs(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <Layout title="Audit Logs" subtitle="Track all admin actions and system events">
      <div className="card">
        <div className="card-header">
          <h3>Recent Activity ({logs.length})</h3>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="empty-state"><div className="spinner" /></div>
          ) : logs.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📋</div>
              <h3>No logs yet</h3>
              <p>Audit logs will appear here as admins perform actions.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Admin</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Details</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(l => (
                    <tr key={l.id}>
                      <td style={{ fontWeight: 500 }}>{l.admin_name || 'System'}</td>
                      <td><span className="badge badge-new">{l.action}</span></td>
                      <td style={{ color: 'var(--text-secondary)' }}>{l.target_type ? `${l.target_type} #${l.target_id}` : '-'}</td>
                      <td style={{ color: 'var(--text-secondary)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.details || '-'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{new Date(l.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
