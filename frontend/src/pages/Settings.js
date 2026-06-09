import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { linkedinAPI } from '../api';
import { settingsAPI } from '../api';
import { useAuth } from '../context/AuthContext';

function LinkedInConnect() {
  const [connected, setConnected] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    linkedinAPI.getStatus()
      .then(r => {
        setConnected(r.data.connected);
        if (r.data.connected) {
          return linkedinAPI.getAdAccounts().then(a => setAccounts(a.data));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleConnect = async () => {
    setConnecting(true); setMsg('');
    try {
      await linkedinAPI.connect();
      setConnected(true);
      setMsg('✅ LinkedIn connected successfully');
      const a = await linkedinAPI.getAdAccounts();
      setAccounts(a.data);
    } catch {
      setMsg('❌ Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect LinkedIn?')) return;
    await linkedinAPI.disconnect();
    setConnected(false);
    setAccounts([]);
    setMsg('LinkedIn disconnected');
  };

  if (loading) return <div className="spinner" style={{ margin: '20px 0' }} />;

  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>LinkedIn Ads</div>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
        Connect your LinkedIn Ads account to sync campaigns and view analytics.
      </div>

      {msg && (
        <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : msg.startsWith('❌') ? 'alert-error' : 'alert-info'}`} style={{ marginBottom: 16 }}>
          {msg}
        </div>
      )}

      {connected ? (
        <>
          <div className="alert alert-success" style={{ marginBottom: 16 }}>
            ✅ LinkedIn is connected
          </div>

          {accounts.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Ad Accounts
              </div>
              {accounts.map(acc => (
                <div key={acc.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', background: 'var(--bg)',
                  borderRadius: 'var(--radius-sm)', marginBottom: 8,
                  fontSize: 14,
                }}>
                  <span>📣</span>
                  <span style={{ fontWeight: 500 }}>{acc.name}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>ID: {acc.id}</span>
                  <span className="badge badge-active" style={{ marginLeft: 'auto' }}>{acc.status}</span>
                </div>
              ))}
            </div>
          )}

          <button className="btn btn-danger btn-sm" onClick={handleDisconnect}>
            Disconnect LinkedIn
          </button>
        </>
      ) : (
        <button
          className="btn btn-primary"
          onClick={handleConnect}
          disabled={connecting}
          style={{ background: '#0a66c2' }}
        >
          {connecting ? 'Connecting...' : '🔗 Connect LinkedIn Account'}
        </button>
      )}
    </div>
  );
}

const Toggle = ({ checked, onChange, label, description }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 0', borderBottom: '1px solid var(--border)'
  }}>
    <div>
      <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--text-primary)' }}>{label}</div>
      {description && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{description}</div>}
    </div>
    <div
      onClick={onChange}
      style={{
        width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
        background: checked ? 'var(--primary)' : '#cbd5e1',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 3,
        left: checked ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%',
        background: 'white', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  </div>
);

// ── USER SETTINGS ───────────────────────────────────────────
function UserSettings({ user }) {
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState({ name: user?.name || '', company: user?.company || '' });
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm: '' });
  const [automation, setAutomation] = useState({
    email_notifications: { value: 'true', is_active: true },
    lead_alerts: { value: 'true', is_active: true },
    weekly_report: { value: 'false', is_active: false },
    auto_followup: { value: 'false', is_active: false },
  });
  const [profileMsg, setProfileMsg] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [autoMsg, setAutoMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsAPI.getAutomation().then(r => {
      if (Object.keys(r.data).length > 0) setAutomation(prev => ({ ...prev, ...r.data }));
    }).catch(() => {});
  }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true); setProfileMsg('');
    try {
      await settingsAPI.updateProfile(profile);
      setProfileMsg('✅ Profile updated successfully');
    } catch (err) {
      setProfileMsg('❌ ' + (err.response?.data?.error || 'Failed to update'));
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg('');
    if (passwords.new_password !== passwords.confirm) {
      return setPasswordMsg('❌ New passwords do not match');
    }
    if (passwords.new_password.length < 6) {
      return setPasswordMsg('❌ Password must be at least 6 characters');
    }
    setSaving(true);
    try {
      await settingsAPI.changePassword({
        current_password: passwords.current_password,
        new_password: passwords.new_password,
      });
      setPasswordMsg('✅ Password changed successfully');
      setPasswords({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      setPasswordMsg('❌ ' + (err.response?.data?.error || 'Failed to change password'));
    } finally {
      setSaving(false);
    }
  };

  const toggleAutomation = async (key) => {
    const current = automation[key] || { value: 'false', is_active: false };
    const newActive = !current.is_active;
    const updated = { ...automation, [key]: { ...current, is_active: newActive, value: String(newActive) } };
    setAutomation(updated);
    try {
      await settingsAPI.saveAutomation({ setting_key: key, setting_value: String(newActive), is_active: newActive });
      setAutoMsg('✅ Saved');
      setTimeout(() => setAutoMsg(''), 2000);
    } catch {
      setAutoMsg('❌ Failed to save');
    }
  };

  return (
    <>
      <div className="tabs">
        {['profile', 'password', 'notifications'].map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="card">
          <div className="card-header"><h3>Profile Information</h3></div>
          <div className="card-body">
            {profileMsg && (
              <div className={`alert ${profileMsg.startsWith('✅') ? 'alert-success' : 'alert-error'}`}>
                {profileMsg}
              </div>
            )}
            <form onSubmit={saveProfile}>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Company</label>
                  <input value={profile.company} onChange={e => setProfile({ ...profile, company: e.target.value })} placeholder="Your company" />
                </div>
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input value={user?.email || ''} disabled style={{ background: 'var(--bg)', color: 'var(--text-muted)' }} />
                <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>Email cannot be changed</small>
              </div>
              <div className="form-group">
                <label>Role</label>
                <input value={user?.role || ''} disabled style={{ background: 'var(--bg)', color: 'var(--text-muted)', textTransform: 'capitalize' }} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tab === 'password' && (
        <div className="card">
          <div className="card-header"><h3>Change Password</h3></div>
          <div className="card-body">
            {passwordMsg && (
              <div className={`alert ${passwordMsg.startsWith('✅') ? 'alert-success' : 'alert-error'}`}>
                {passwordMsg}
              </div>
            )}
            <form onSubmit={savePassword}>
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  placeholder="Enter current password"
                  value={passwords.current_password}
                  onChange={e => setPasswords({ ...passwords, current_password: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  placeholder="Min. 6 characters"
                  value={passwords.new_password}
                  onChange={e => setPasswords({ ...passwords, new_password: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Repeat new password"
                  value={passwords.confirm}
                  onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {tab === 'notifications' && (
        <div className="card">
          <div className="card-header">
            <h3>Notification & Automation Settings</h3>
            {autoMsg && <span style={{ fontSize: 13, color: autoMsg.startsWith('✅') ? 'var(--success)' : 'var(--danger)' }}>{autoMsg}</span>}
          </div>
          <div className="card-body">
            <Toggle
              checked={automation.email_notifications?.is_active ?? true}
              onChange={() => toggleAutomation('email_notifications')}
              label="Email Notifications"
              description="Receive email updates about campaign performance and new leads"
            />
            <Toggle
              checked={automation.lead_alerts?.is_active ?? true}
              onChange={() => toggleAutomation('lead_alerts')}
              label="New Lead Alerts"
              description="Get notified instantly when a new lead is captured"
            />
            <Toggle
              checked={automation.weekly_report?.is_active ?? false}
              onChange={() => toggleAutomation('weekly_report')}
              label="Weekly Performance Report"
              description="Receive a weekly summary of your campaign metrics every Monday"
            />
            <Toggle
              checked={automation.auto_followup?.is_active ?? false}
              onChange={() => toggleAutomation('auto_followup')}
              label="Auto Follow-up Reminders"
              description="Get reminders to follow up on leads that haven't been contacted"
            />
          </div>
        </div>
      )}
    </>
  );
}

// ── ADMIN SETTINGS ──────────────────────────────────────────
function AdminSettings() {
  const [tab, setTab] = useState('system');
  const [systemStats, setSystemStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tab === 'system') {
      setLoading(true);
      settingsAPI.getSystemStats().then(r => setSystemStats(r.data)).finally(() => setLoading(false));
    }
    if (tab === 'users') {
      setLoading(true);
      settingsAPI.getAdminUsers().then(r => setUsers(r.data)).finally(() => setLoading(false));
    }
  }, [tab]);

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <div className="alert alert-info">🛡️ You are viewing admin settings. Changes here affect all users.</div>
      </div>

      <div className="tabs">
        {['system', 'users', 'api'].map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'api' ? 'API & Integrations' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'system' && (
        <div className="card">
          <div className="card-header"><h3>System Overview</h3></div>
          <div className="card-body">
            {loading ? <div className="empty-state"><div className="spinner" /></div> : (
              <>
                <div className="stats-grid" style={{ marginBottom: 24 }}>
                  <div className="stat-card">
                    <div className="stat-icon blue">👥</div>
                    <div className="stat-info">
                      <div className="stat-value">{systemStats?.totalUsers ?? 0}</div>
                      <div className="stat-label">Total Users</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon amber">📣</div>
                    <div className="stat-info">
                      <div className="stat-value">{systemStats?.totalCampaigns ?? 0}</div>
                      <div className="stat-label">Total Campaigns</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon green">🎯</div>
                    <div className="stat-info">
                      <div className="stat-value">{systemStats?.totalLeads ?? 0}</div>
                      <div className="stat-label">Total Leads</div>
                    </div>
                  </div>
                </div>

                <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>Server Info</div>
                  {[
                    ['Node.js Version', systemStats?.nodeVersion],
                    ['Server Uptime', systemStats?.uptime],
                    ['Database', 'PostgreSQL (Neon)'],
                    ['Environment', process.env.NODE_ENV || 'production'],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                      <span style={{ fontWeight: 500, fontFamily: 'monospace' }}>{value || '-'}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="card">
          <div className="card-header"><h3>All Users ({users.length})</h3></div>
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
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="user-avatar" style={{ width: 32, height: 32, fontSize: 13 }}>
                              {u.name[0]?.toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 500 }}>{u.name}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{u.company || '-'}</td>
                        <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

{tab === 'api' && (
  <div className="card">
    <div className="card-header"><h3>API & Integrations</h3></div>
    <div className="card-body">

      <LinkedInConnect />

      <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Security</div>
        <Toggle checked={true} onChange={() => {}} label="Force HTTPS" description="Redirect all HTTP traffic to HTTPS" />
        <Toggle checked={true} onChange={() => {}} label="JWT Token Expiry" description="Tokens expire after 7 days (recommended)" />
        <Toggle checked={false} onChange={() => {}} label="Two-Factor Authentication" description="Require 2FA for all admin accounts" />
      </div>
    </div>
  </div>
)}
    </>
  );
}

// ── MAIN SETTINGS PAGE ──────────────────────────────────────
export default function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <Layout title="Settings" subtitle={isAdmin ? 'Manage your profile and system configuration' : 'Manage your account preferences'}>
      <div style={{ maxWidth: 720 }}>
        <UserSettings user={user} />
        {isAdmin && (
          <div style={{ marginTop: 40 }}>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>Admin Configuration</h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>System-wide settings visible only to admins</p>
            </div>
            <AdminSettings />
          </div>
        )}
      </div>
    </Layout>
  );
}

