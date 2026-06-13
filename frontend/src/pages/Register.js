import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_OPTIONS = [
  { value: 'user', label: 'Manager', desc: 'Full access to campaigns, leads, and analytics' },
  { value: 'sales', label: 'Sales Rep', desc: 'View and manage assigned leads only' },
  { value: 'viewer', label: 'Viewer', desc: 'Read-only access to reports and dashboards' },
];

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', company: '', role: 'user' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-logo">
          <div className="auth-logo-icon">L</div>
          <span className="auth-logo-text">LinkedCRM</span>
        </div>
        <div className="auth-tagline">
          <h1>Start Growing<br /><span>Your Pipeline</span></h1>
          <p>Create an account and start running LinkedIn campaigns that bring real leads to your CRM.</p>
        </div>
        <div className="auth-features">
          {['Free to get started', 'LinkedIn API integration', 'Auto lead capture & scoring', 'Export leads as CSV'].map(f => (
            <div className="auth-feature-item" key={f}>
              <span className="dot" />
              {f}
            </div>
          ))}
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrapper">
          <h2>Create account</h2>
          <p className="subtitle">Get started with LinkedCRM today</p>

          {error && <div className="alert alert-error">⚠ {error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Full name</label>
                <input placeholder="John Doe" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Company</label>
                <input placeholder="Acme Inc." value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Email address</label>
              <input type="email" placeholder="you@company.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" placeholder="Min. 8 characters" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
            </div>
            
            <div className="form-group">
              <label>Your Role</label>
              <div style={{ display: 'grid', gap: 10 }}>
                {ROLE_OPTIONS.map(opt => (
                  <label key={opt.value} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: 12, border: '2px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                    backgroundColor: form.role === opt.value ? 'var(--bg-secondary)' : 'transparent',
                    borderColor: form.role === opt.value ? 'var(--primary)' : 'var(--border)',
                    transition: 'all 0.2s'
                  }}>
                    <input
                      type="radio"
                      value={opt.value}
                      checked={form.role === opt.value}
                      onChange={e => setForm({ ...form, role: e.target.value })}
                      style={{ marginTop: 2 }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{opt.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            
            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 20 }}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)' }}>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
