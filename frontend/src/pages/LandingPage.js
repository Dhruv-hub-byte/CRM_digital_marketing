import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

export default function LandingPage() {
  const { campaignId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', job_title: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/landing/campaign/${campaignId}`)
      .then(r => setData(r.data))
      .catch(() => setError('Campaign not found'))
      .finally(() => setLoading(false));
  }, [campaignId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/landing/campaign/${campaignId}/interest`,
        { ...form, ad_id: data?.ad?.id }
      );
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#0a66c2', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
        <h2>{error}</h2>
      </div>
    </div>
  );

  if (submitted) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontFamily: 'sans-serif', background: '#f0f4f8' }}>
      <div style={{ textAlign: 'center', background: 'white', padding: 48, borderRadius: 16, maxWidth: 480 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <h2 style={{ color: '#0a66c2', marginBottom: 12 }}>Thank you!</h2>
        <p style={{ color: '#475569' }}>We received your interest. Our team will contact you shortly.</p>
      </div>
    </div>
  );

  const { campaign, ad } = data;

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#0a66c2', padding: '20px 0' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ color: 'white', fontSize: 22, fontWeight: 700 }}>
            Saffron Synaptiq Software Lab
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* Left — campaign info */}
          <div>
            <div style={{ background: 'white', borderRadius: 16, padding: 32, marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#0a66c2', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                {campaign.objective || 'Campaign'}
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 16, lineHeight: 1.3 }}>
                {campaign.name}
              </h1>
              {ad && (
                <p style={{ color: '#475569', fontSize: 15, lineHeight: 1.7 }}>
                  {ad.ad_copy}
                </p>
              )}
            </div>

            {ad?.loom_url && (
              <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden' }}>
                <iframe
                  src={ad.loom_url.replace('/share/', '/embed/')}
                  style={{ width: '100%', height: 240, border: 'none' }}
                  allowFullScreen
                  title="Ad video"
                />
              </div>
            )}

            <div style={{ background: 'white', borderRadius: 16, padding: 24, marginTop: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
                Campaign Details
              </div>
              {[
                ['Industry', campaign.industry],
                ['Location', campaign.location],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 14 }}>
                  <span style={{ color: '#64748b' }}>{label}</span>
                  <span style={{ fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — interest form */}
          <div>
            <div style={{ background: 'white', borderRadius: 16, padding: 32, position: 'sticky', top: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>
                I'm Interested
              </h2>
              <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>
                Fill in your details and our team will reach out to you.
              </p>

              {error && (
                <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {[
                  { key: 'name', label: 'Full Name *', placeholder: 'John Doe', required: true },
                  { key: 'email', label: 'Work Email *', placeholder: 'john@company.com', type: 'email', required: true },
                  { key: 'phone', label: 'Phone', placeholder: '+91 98765 43210' },
                  { key: 'company', label: 'Company', placeholder: 'Acme Corp' },
                  { key: 'job_title', label: 'Job Title', placeholder: 'Marketing Manager' },
                ].map(field => (
                  <div key={field.key} style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 6 }}>
                      {field.label}
                    </label>
                    <input
                      type={field.type || 'text'}
                      value={form[field.key]}
                      onChange={f(field.key)}
                      placeholder={field.placeholder}
                      required={field.required}
                      style={{
                        width: '100%', padding: '10px 14px',
                        border: '1.5px solid #e2e8f0', borderRadius: 8,
                        fontSize: 14, outline: 'none', boxSizing: 'border-box',
                        fontFamily: 'sans-serif',
                      }}
                    />
                  </div>
                ))}

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 6 }}>
                    Message (optional)
                  </label>
                  <textarea
                    value={form.message}
                    onChange={f('message')}
                    placeholder="Tell us what you're looking for..."
                    rows={3}
                    style={{
                      width: '100%', padding: '10px 14px',
                      border: '1.5px solid #e2e8f0', borderRadius: 8,
                      fontSize: 14, outline: 'none', resize: 'vertical',
                      fontFamily: 'sans-serif', boxSizing: 'border-box',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: '100%', padding: '13px',
                    background: '#0a66c2', color: 'white',
                    border: 'none', borderRadius: 8,
                    fontSize: 15, fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? 'Submitting...' : "Yes, I'm Interested →"}
                </button>

                <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 12 }}>
                  We respect your privacy. No spam, ever.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}