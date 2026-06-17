const { pool } = require('../db');
const { sendEmail, isEnabled, getUserEmail, templates } = require('./email');

const sendWeeklyReports = async () => {
  try {
    const users = await pool.query('SELECT id FROM users');
    for (const u of users.rows) {
      const enabled = await isEnabled(pool, u.id, 'weekly_report');
      if (!enabled) continue;

      const userInfo = await getUserEmail(pool, u.id);
      if (!userInfo) continue;

      const [leads, campaigns, converted, ads] = await Promise.all([
        pool.query('SELECT COUNT(*) as total FROM leads WHERE user_id=$1', [u.id]),
        pool.query("SELECT COUNT(*) as total FROM campaigns WHERE user_id=$1 AND status='active'", [u.id]),
        pool.query("SELECT COUNT(*) as total FROM leads WHERE user_id=$1 AND status='converted'", [u.id]),
        pool.query("SELECT COUNT(*) as total FROM marketing_ads WHERE user_id=$1 AND status='published'", [u.id]),
      ]);

      const stats = {
        totalLeads: leads.rows[0].total,
        activeCampaigns: campaigns.rows[0].total,
        converted: converted.rows[0].total,
        adsPublished: ads.rows[0].total,
      };

      const { subject, html } = templates.weeklyReport(userInfo.name, stats);
      await sendEmail(userInfo.email, subject, html);
    }
    console.log('Weekly reports sent');
  } catch (err) {
    console.error('Weekly report error:', err.message);
  }
};

module.exports = { sendWeeklyReports };