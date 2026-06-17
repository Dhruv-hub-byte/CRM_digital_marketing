import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Toast from './Toast';
import useToast from '../hooks/useToast';

// Export context so any page can use it
export const ToastContext = React.createContext(null);

export default function Layout({ title, subtitle, actions, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toasts, showToast, removeToast } = useToast();

  return (
    <ToastContext.Provider value={showToast}>
      <div className="app-layout">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="main-content">
          <header className="topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                className={`hamburger ${sidebarOpen ? 'open' : ''}`}
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Toggle menu"
              >
                <span />
                <span />
                <span />
              </button>
              <div className="topbar-left">
                <h1>{title}</h1>
                {subtitle && <p>{subtitle}</p>}
              </div>
            </div>
            {actions && <div className="topbar-right">{actions}</div>}
          </header>

          <main className="page-body">
            {children}
          </main>
        </div>

        {/* Toast container */}
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          {toasts.map(t => (
            <Toast
              key={t.id}
              message={t.message}
              type={t.type}
              onClose={() => removeToast(t.id)}
            />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}