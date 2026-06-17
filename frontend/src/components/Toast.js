import React, { useEffect, useState } from 'react';

export default function Toast({ message, type = 'success', onClose }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: { bg: '#dcfce7', border: '#bbf7d0', color: '#166534', icon: '✅' },
    error: { bg: '#fee2e2', border: '#fecaca', color: '#991b1b', icon: '❌' },
    info: { bg: '#dbeafe', border: '#bfdbfe', color: '#1e40af', icon: 'ℹ️' },
    warning: { bg: '#fef3c7', border: '#fde68a', color: '#92400e', icon: '⚠️' },
  };

  const s = colors[type] || colors.success;

  return (
    <div style={{
      background: s.bg, border: `1px solid ${s.border}`,
      color: s.color, padding: '14px 20px',
      borderRadius: 10, fontSize: 14, fontWeight: 500,
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      minWidth: 280, maxWidth: 400,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(10px)',
      transition: 'all 0.3s ease',
    }}>
      <span>{s.icon}</span>
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: s.color, fontSize: 16 }}
      >✕</button>
    </div>
  );
}