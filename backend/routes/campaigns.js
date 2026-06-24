const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { auth } = require('../middleware/auth');
const { sendEmail, isEnabled, getUserEmail, templates } = require('../utils/email');

// ─── Auto-update campaign statuses based on dates ─────────────────
// Called on every GET /campaigns so status is always current
const syncCampaignStatuses = async () => {
  try {
    // draft → active: start_date has arrived
    await pool.query(`
      UPDATE campaigns
      SET status = 'active', updated_at = NOW()
      WHERE status = 'draft'
        AND start_date IS NOT NULL
        AND start_date <= CURRENT_DATE
        AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    `);

    // active/draft → completed: end_date has passed
    await pool.query(`
      UPDATE campaigns
      SET status = 'completed', updated_at = NOW()
      WHERE status IN ('active', 'draft', 'paused')
        AND end_date IS NOT NULL
        AND end_date < CURRENT_DATE
    `);
  } catch (err) {
    console.error('Campaign status sync error:', err.message);
  }
};

// ─── Get all campaigns ────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    await syncCampaignStatuses();

    const isAdmin = req.user.role === 'admin';
    const query = isAdmin
      ? `SELECT c.*, u.name as owner_name,
              (SELECT COUNT(*) FROM marketing_ads ma WHERE ma.campaign_id = c.id) as ads_count
         FROM campaigns c
         LEFT JOIN users u ON c.user_id = u.id
         ORDER BY c.created_at DESC`
      : `SELECT c.*, u.name as owner_name,
              (SELECT COUNT(*) FROM marketing_ads ma WHERE ma.campaign_id = c.id) as ads_count
         FROM campaigns c
         LEFT JOIN users u ON c.user_id = u.id
         WHERE c.user_id = $1
         ORDER BY c.created_at DESC`;

    const result = await pool.query(query, isAdmin ? [] : [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Get ads for a campaign ───────────────────────────────────────
router.get('/:id/ads', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ma.*, u.name as creator_name, at.name as template_name
       FROM marketing_ads ma
       LEFT JOIN users u ON ma.user_id = u.id
       LEFT JOIN ad_templates at ON ma.template_id = at.id
       WHERE ma.campaign_id = $1
       ORDER BY ma.created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Get single campaign ──────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*,
              (SELECT COUNT(*) FROM marketing_ads ma WHERE ma.campaign_id = c.id) as ads_count
       FROM campaigns c
       WHERE c.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Campaign not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Create campaign ──────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  const {
    name, objective, industry, location, audience_size, budget,
    ad_copy, creative_url, start_date, end_date,
    target_job_titles, target_industries, target_locations,
    target_company_sizes, target_seniorities
  } = req.body;
  if (!name) return res.status(400).json({ error: 'Campaign name is required' });

  try {
    // Determine initial status based on dates
    let initialStatus = 'draft';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start_date && end_date) {
      const start = new Date(start_date);
      const end = new Date(end_date);
      if (end < today) initialStatus = 'completed';
      else if (start <= today) initialStatus = 'active';
    }

    const result = await pool.query(
      `INSERT INTO campaigns (
        user_id, name, objective, industry, location, audience_size, budget,
        ad_copy, creative_url, start_date, end_date, status,
        target_job_titles, target_industries, target_locations,
        target_company_sizes, target_seniorities
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING *`,
      [
        req.user.id, name, objective, industry, location,
        audience_size || 0, budget || 0, ad_copy, creative_url,
        start_date || null, end_date || null, initialStatus,
        target_job_titles || [],
        target_industries || [],
        target_locations || [],
        target_company_sizes || [],
        target_seniorities || [],
      ]
    );

    // Email — non-blocking
    getUserEmail(pool, req.user.id).then(async (userInfo) => {
      if (!userInfo) return;
      const enabled = await isEnabled(pool, req.user.id, 'email_notifications');
      if (!enabled) return;
      const { subject, html } = templates.campaignCreated(userInfo.name, result.rows[0]);
      await sendEmail(userInfo.email, subject, html);
    }).catch(e => console.error('Campaign email error:', e.message));

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Update campaign ──────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  const {
    name, objective, industry, location, audience_size, budget,
    ad_copy, creative_url, start_date, end_date, status,
    target_job_titles, target_industries, target_locations,
    target_company_sizes, target_seniorities
  } = req.body;

  try {
    // Recalculate status based on dates unless manually set to paused
    let resolvedStatus = status;
    if (status !== 'paused') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (end_date && new Date(end_date) < today) {
        resolvedStatus = 'completed';
      } else if (start_date && new Date(start_date) <= today) {
        resolvedStatus = 'active';
      }
    }

    const result = await pool.query(
      `UPDATE campaigns SET
        name=$1, objective=$2, industry=$3, location=$4, audience_size=$5,
        budget=$6, ad_copy=$7, creative_url=$8, start_date=$9, end_date=$10,
        status=$11, target_job_titles=$12, target_industries=$13,
        target_locations=$14, target_company_sizes=$15, target_seniorities=$16,
        updated_at=NOW()
       WHERE id=$17 AND (user_id=$18 OR $19::boolean)
       RETURNING *`,
      [
        name, objective, industry, location, audience_size, budget,
        ad_copy, creative_url, start_date || null, end_date || null,
        resolvedStatus,
        target_job_titles || [],
        target_industries || [],
        target_locations || [],
        target_company_sizes || [],
        target_seniorities || [],
        req.params.id, req.user.id, req.user.role === 'admin',
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Campaign not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Delete campaign ──────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM campaigns WHERE id=$1 AND (user_id=$2 OR $3::boolean)',
      [req.params.id, req.user.id, req.user.role === 'admin']
    );
    res.json({ message: 'Campaign deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Campaign analytics ───────────────────────────────────────────
router.get('/:id/analytics', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM campaign_analytics WHERE campaign_id=$1 ORDER BY date DESC LIMIT 30',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Landing leads ────────────────────────────────────────────────
router.get('/:id/landing-leads', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM landing_leads WHERE campaign_id=$1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.syncCampaignStatuses = syncCampaignStatuses;