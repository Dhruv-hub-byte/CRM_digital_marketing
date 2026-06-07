const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { auth } = require('../middleware/auth');

// Get all campaigns for user
router.get('/', auth, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const query = isAdmin
      ? 'SELECT c.*, u.name as owner_name FROM campaigns c LEFT JOIN users u ON c.user_id = u.id ORDER BY c.created_at DESC'
      : 'SELECT c.*, u.name as owner_name FROM campaigns c LEFT JOIN users u ON c.user_id = u.id WHERE c.user_id = $1 ORDER BY c.created_at DESC';
    const params = isAdmin ? [] : [req.user.id];
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single campaign
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM campaigns WHERE id = $1 AND (user_id = $2 OR $3 = true)', [req.params.id, req.user.id, req.user.role === 'admin']);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Campaign not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create campaign
router.post('/', auth, async (req, res) => {
  const { name, objective, industry, location, audience_size, budget, ad_copy, creative_url, start_date, end_date } = req.body;
  if (!name) return res.status(400).json({ error: 'Campaign name is required' });
  try {
    const result = await pool.query(
      `INSERT INTO campaigns (user_id, name, objective, industry, location, audience_size, budget, ad_copy, creative_url, start_date, end_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'draft') RETURNING *`,
      [req.user.id, name, objective, industry, location, audience_size || 0, budget || 0, ad_copy, creative_url, start_date, end_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update campaign
router.put('/:id', auth, async (req, res) => {
  const { name, objective, industry, location, audience_size, budget, ad_copy, creative_url, start_date, end_date, status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE campaigns SET name=$1, objective=$2, industry=$3, location=$4, audience_size=$5, budget=$6, ad_copy=$7, creative_url=$8, start_date=$9, end_date=$10, status=$11, updated_at=NOW()
       WHERE id=$12 AND (user_id=$13 OR $14=true) RETURNING *`,
      [name, objective, industry, location, audience_size, budget, ad_copy, creative_url, start_date, end_date, status, req.params.id, req.user.id, req.user.role === 'admin']
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Campaign not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete campaign
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM campaigns WHERE id=$1 AND (user_id=$2 OR $3=true)', [req.params.id, req.user.id, req.user.role === 'admin']);
    res.json({ message: 'Campaign deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get campaign analytics
router.get('/:id/analytics', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM campaign_analytics WHERE campaign_id=$1 ORDER BY date DESC LIMIT 30', [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
