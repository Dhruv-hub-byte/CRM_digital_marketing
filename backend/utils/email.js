const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM = process.env.SENDGRID_FROM_EMAIL;

const sendEmail = async (to, subject, html) => {
  try {
    await sgMail.send({ to, from: FROM, subject, html });
    console.log(`Email sent to ${to}: ${subject}`);
  } catch (err) {
    console.error('Email error:', err.response?.body || err.message);
  }
};

// Check if user has notification enabled
const isEnabled = async (pool, userId, key) => {
  const result = await pool.query(
    "SELECT is_active FROM automation_settings WHERE user_id=$1 AND setting_key=$2",
    [userId, key]
  );
  return result.rows.length === 0 || result.rows[0].is_active;
};

// Get user email
const getUserEmail = async (pool, userId) => {
  const result = await pool.query('SELECT email, name FROM users WHERE id=$1', [userId]);
  return result.rows[0] || null;
};

// Templates
const templates = {
  newLead: (userName, lead) => ({
    subject: `New Lead: ${lead.name}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#0a66c2;">New Lead Captured</h2>
        <p>Hi ${userName},</p>
        <p>A new lead has been added to your CRM.</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">Name</td><td style="padding:8px;border:1px solid #e2e8f0;">${lead.name}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">Email</td><td style="padding:8px;border:1px solid #e2e8f0;">${lead.email}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">Company</td><td style="padding:8px;border:1px solid #e2e8f0;">${lead.company || '-'}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">Source</td><td style="padding:8px;border:1px solid #e2e8f0;">${lead.source || 'linkedin'}</td></tr>
        </table>
        <a href="${process.env.FRONTEND_URL}/leads" style="background:#0a66c2;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;">View Lead</a>
      </div>
    `,
  }),

  leadStatusChanged: (userName, lead, oldStatus) => ({
    subject: `Lead Update: ${lead.name} → ${lead.status}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#0a66c2;">Lead Status Changed</h2>
        <p>Hi ${userName},</p>
        <p><strong>${lead.name}</strong> moved from <strong>${oldStatus}</strong> to <strong>${lead.status}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">Name</td><td style="padding:8px;border:1px solid #e2e8f0;">${lead.name}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">Email</td><td style="padding:8px;border:1px solid #e2e8f0;">${lead.email}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">New Status</td><td style="padding:8px;border:1px solid #e2e8f0;color:#0a66c2;font-weight:600;">${lead.status}</td></tr>
        </table>
        <a href="${process.env.FRONTEND_URL}/leads" style="background:#0a66c2;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;">View Lead</a>
      </div>
    `,
  }),

  adPublished: (userName, ad) => ({
    subject: `Ad Published: ${ad.title}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#0a66c2;">Ad Published Successfully</h2>
        <p>Hi ${userName},</p>
        <p>Your ad has been published.</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">Title</td><td style="padding:8px;border:1px solid #e2e8f0;">${ad.title}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">Published At</td><td style="padding:8px;border:1px solid #e2e8f0;">${new Date().toLocaleString()}</td></tr>
        </table>
        <a href="${process.env.FRONTEND_URL}/ads" style="background:#0a66c2;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;">View Ad</a>
      </div>
    `,
  }),

  campaignCreated: (userName, campaign) => ({
    subject: `Campaign Created: ${campaign.name}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#0a66c2;">New Campaign Created</h2>
        <p>Hi ${userName},</p>
        <p>A new campaign has been created in your CRM.</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">Name</td><td style="padding:8px;border:1px solid #e2e8f0;">${campaign.name}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">Objective</td><td style="padding:8px;border:1px solid #e2e8f0;">${campaign.objective || '-'}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">Budget</td><td style="padding:8px;border:1px solid #e2e8f0;">₹${campaign.budget || 0}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">Status</td><td style="padding:8px;border:1px solid #e2e8f0;">${campaign.status}</td></tr>
        </table>
        <a href="${process.env.FRONTEND_URL}/campaigns" style="background:#0a66c2;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;">View Campaign</a>
      </div>
    `,
  }),

  weeklyReport: (userName, stats) => ({
    subject: `Weekly CRM Report — ${new Date().toLocaleDateString()}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#0a66c2;">Your Weekly Summary</h2>
        <p>Hi ${userName}, here's what happened this week.</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">Total Leads</td><td style="padding:8px;border:1px solid #e2e8f0;">${stats.totalLeads}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">Active Campaigns</td><td style="padding:8px;border:1px solid #e2e8f0;">${stats.activeCampaigns}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">Converted Leads</td><td style="padding:8px;border:1px solid #e2e8f0;">${stats.converted}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">Ads Published</td><td style="padding:8px;border:1px solid #e2e8f0;">${stats.adsPublished}</td></tr>
        </table>
        <a href="${process.env.FRONTEND_URL}/dashboard" style="background:#0a66c2;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;">View Dashboard</a>
      </div>
    `,
  }),
};

module.exports = { sendEmail, isEnabled, getUserEmail, templates };