const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Public — no auth needed
// Get campaign info for landing page
router.get('/campaign/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, objective, industry, location, ad_copy, creative_url
       FROM campaigns WHERE id=$1 AND status='active'`,
      [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Campaign not found' });

    // Get published ad for this campaign
    const ad = await pool.query(
      `SELECT id, title, ad_copy, loom_url, external_ad_url
       FROM marketing_ads
       WHERE campaign_id=$1 AND status='published'
       ORDER BY published_at DESC LIMIT 1`,
      [req.params.id]
    );

    res.json({
      campaign: result.rows[0],
      ad: ad.rows[0] || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit interest — creates lead
router.post('/campaign/:id/interest', async (req, res) => {
  const { name, email, phone, company, job_title, message, ad_id } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

  try {
    // Save to landing_leads
    const landingLead = await pool.query(
      `INSERT INTO landing_leads (campaign_id, ad_id, name, email, phone, company, job_title, message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.params.id, ad_id || null, name, email, phone, company, job_title, message]
    );

    // Also save to main leads table
    const campaign = await pool.query('SELECT user_id FROM campaigns WHERE id=$1', [req.params.id]);
    const userId = campaign.rows[0]?.user_id;

    if (userId) {
      await pool.query(
        `INSERT INTO leads (campaign_id, user_id, name, email, phone, company, job_title, status, source, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'new', 'landing_page', $8)`,
        [req.params.id, userId, name, email, phone, company, job_title, message || null]
      );

      // Update campaign leads count
      await pool.query(
        'UPDATE campaigns SET leads_count = leads_count + 1 WHERE id=$1',
        [req.params.id]
      );
    }

    res.status(201).json({ message: 'Thank you for your interest! We will contact you soon.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;