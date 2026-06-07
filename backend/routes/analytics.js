const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

// Dashboard stats for user
router.get('/dashboard', auth, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const userFilter = isAdmin ? '' : 'WHERE user_id = $1';
    const params = isAdmin ? [] : [req.user.id];

    const [campaigns, leads, activeCampaigns] = await Promise.all([
      pool.query(`SELECT COUNT(*) as total FROM campaigns ${userFilter}`, params),
      pool.query(`SELECT COUNT(*) as total FROM leads ${userFilter}`, params),
      pool.query(
        isAdmin
          ? 'SELECT COUNT(*) as total FROM campaigns WHERE status = $1'
          : 'SELECT COUNT(*) as total FROM campaigns WHERE user_id = $1 AND status = $2',
        isAdmin ? ['active'] : [req.user.id, 'active']
      ),
    ]);

    // Lead status breakdown
    const leadStatusQ = isAdmin
      ? 'SELECT status, COUNT(*) as count FROM leads GROUP BY status'
      : 'SELECT status, COUNT(*) as count FROM leads WHERE user_id = $1 GROUP BY status';
    const leadStatus = await pool.query(leadStatusQ, params);

    // Recent leads
    const recentLeadsQ = isAdmin
      ? 'SELECT l.*, c.name as campaign_name FROM leads l LEFT JOIN campaigns c ON l.campaign_id = c.id ORDER BY l.created_at DESC LIMIT 5'
      : 'SELECT l.*, c.name as campaign_name FROM leads l LEFT JOIN campaigns c ON l.campaign_id = c.id WHERE l.user_id = $1 ORDER BY l.created_at DESC LIMIT 5';
    const recentLeads = await pool.query(recentLeadsQ, params);

    // Recent campaigns
    const recentCampaignsQ = isAdmin
      ? 'SELECT * FROM campaigns ORDER BY created_at DESC LIMIT 5'
      : 'SELECT * FROM campaigns WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5';
    const recentCampaigns = await pool.query(recentCampaignsQ, params);

    res.json({
      stats: {
        totalCampaigns: parseInt(campaigns.rows[0].total),
        totalLeads: parseInt(leads.rows[0].total),
        activeCampaigns: parseInt(activeCampaigns.rows[0].total),
      },
      leadStatusBreakdown: leadStatus.rows,
      recentLeads: recentLeads.rows,
      recentCampaigns: recentCampaigns.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
