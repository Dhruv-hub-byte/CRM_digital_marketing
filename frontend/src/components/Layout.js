import React from 'react';
import Sidebar from './Sidebar';

export default function Layout({ title, subtitle, actions, children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions && <div className="topbar-right">{actions}</div>}
        </header>
        <main className="page-body">
          {children}
        </main>
      </div>
    </div>
  );
}
