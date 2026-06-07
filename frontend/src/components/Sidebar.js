import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { label: 'Dashboard', icon: '📊', path: '/dashboard' },
  { label: 'Campaigns', icon: '📣', path: '/campaigns' },
  { label: 'Leads', icon: '👥', path: '/leads' },
  { label: 'Analytics', icon: '📈', path: '/analytics' },
];

const adminItems = [
  { label: 'User Management', icon: '🛡️', path: '/admin/users' },
  { label: 'Audit Logs', icon: '📋', path: '/admin/logs' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

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

        {user?.role === 'admin' && (
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
            <div className="user-role">{user?.role}</div>
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
