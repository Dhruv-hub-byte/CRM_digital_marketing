import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { adminAPI } from '../api';
import { useAuth } from '../context/AuthContext';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();

  const load = () => adminAPI.getUsers().then(r => setUsers(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const toggleRole = async (u) => {
    if (u.id === currentUser?.id) return alert("You can't change your own role");
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Change ${u.name} to ${newRole}?`)) return;
    await adminAPI.updateRole(u.id, newRole);
    load();
  };

  const deleteUser = async (u) => {
    if (u.id === currentUser?.id) return alert("You can't delete yourself");
    if (!window.confirm(`Delete user ${u.name}? This removes all their data.`)) return;
    await adminAPI.deleteUser(u.id);
    load();
  };

  return (
    <Layout title="User Management" subtitle="Manage all platform users and permissions">
      <div className="card">
        <div className="card-header">
          <h3>{users.length} Users</h3>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="empty-state"><div className="spinner" /></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Company</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="user-avatar" style={{ width: 32, height: 32, fontSize: 13 }}>{u.name[0]?.toUpperCase()}</div>
                          <span style={{ fontWeight: 500 }}>{u.name}{u.id === currentUser?.id && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>(you)</span>}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{u.company || '-'}</td>
                      <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className="actions-cell">
                          <button className="btn btn-secondary btn-sm" onClick={() => toggleRole(u)}>
                            Make {u.role === 'admin' ? 'User' : 'Admin'}
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteUser(u)}>Delete</button>
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
    </Layout>
  );
}
