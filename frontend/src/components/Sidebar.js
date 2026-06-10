import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const allNavItems = [
  { label: 'Dashboard', icon: '📊', path: '/dashboard', roles: ['admin', 'user', 'sales', 'viewer'] },
  { label: 'Campaigns', icon: '📣', path: '/campaigns', roles: ['admin', 'user', 'viewer'] },
  { label: 'Leads', icon: '👥', path: '/leads', roles: ['admin', 'user', 'sales'] },
  { label: 'Analytics', icon: '📈', path: '/analytics', roles: ['admin', 'user', 'viewer'] },
  { label: 'LinkedIn Ads', icon: '🔗', path: '/linkedin', roles: ['admin', 'user'] },
  { label: 'Settings', icon: '⚙️', path: '/settings', roles: ['admin', 'user', 'sales', 'viewer'] },
];

const adminItems = [
  { label: 'User Management', icon: '🛡️', path: '/admin/users' },
  { label: 'Audit Logs', icon: '📋', path: '/admin/logs' },
];

const ROLE_COLORS = {
  admin: '#ef4444',
  user: '#0a66c2',
  sales: '#10b981',
  viewer: '#f59e0b',
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path) => location.pathname === path;
  const role = user?.role || 'user';

  const navItems = allNavItems.filter(item => item.roles.includes(role));

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">L</div>
        <span className="sidebar-logo-text">LinkedCRM</span>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Main</div>
        {navItems.map(item => (
          <button
            key={item.path}
            className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}

        {role === 'admin' && (
          <>
            <div className="nav-section-label">Admin</div>
            {adminItems.map(item => (
              <button
                key={item.path}
                className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{user?.name?.[0]?.toUpperCase() || 'U'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="user-name">{user?.name}</div>
            <div style={{
              fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: 0.5, color: ROLE_COLORS[role] || '#64748b'
            }}>
              {role}
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 18 }}
          >⇥</button>
        </div>
      </div>
    </aside>
  );
}