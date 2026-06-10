const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { auth, noViewer, salesOrAbove } = require('../middleware/auth');

// Get all leads
router.get('/', auth, async (req, res) => {
  try {
    const { status, campaign_id, search } = req.query;
    const role = req.user.role;

    let query = `SELECT l.*, c.name as campaign_name, u.name as assigned_to_name 
                 FROM leads l 
                 LEFT JOIN campaigns c ON l.campaign_id = c.id 
                 LEFT JOIN users u ON l.assigned_to = u.id
                 WHERE 1=1`;
    const params = [];
    let idx = 1;

    // Sales people only see their assigned leads
    if (role === 'sales') {
      query += ` AND (l.assigned_to = $${idx} OR l.user_id = $${idx})`;
      params.push(req.user.id); idx++;
    } else if (role !== 'admin') {
      query += ` AND l.user_id = $${idx++}`;
      params.push(req.user.id);
    }

    if (status) { query += ` AND l.status = $${idx++}`; params.push(status); }
    if (campaign_id) { query += ` AND l.campaign_id = $${idx++}`; params.push(campaign_id); }
    if (search) {
      query += ` AND (l.name ILIKE $${idx} OR l.email ILIKE $${idx} OR l.company ILIKE $${idx})`;
      params.push(`%${search}%`); idx++;
    }

    query += ' ORDER BY l.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single lead
router.get('/:id', auth, async (req, res) => {
  try {
    const lead = await pool.query(
      `SELECT l.*, c.name as campaign_name, u.name as assigned_to_name 
       FROM leads l 
       LEFT JOIN campaigns c ON l.campaign_id = c.id
       LEFT JOIN users u ON l.assigned_to = u.id
       WHERE l.id=$1`,
      [req.params.id]
    );
    if (lead.rows.length === 0) return res.status(404).json({ error: 'Lead not found' });
    const activities = await pool.query(
      'SELECT la.*, u.name as user_name FROM lead_activities la LEFT JOIN users u ON la.user_id = u.id WHERE la.lead_id=$1 ORDER BY la.created_at DESC',
      [req.params.id]
    );
    res.json({ ...lead.rows[0], activities: activities.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create lead — sales and above only, viewers blocked
router.post('/', auth, noViewer, async (req, res) => {
  const { campaign_id, name, email, phone, company, job_title, industry, linkedin_url, status, notes, source, assigned_to } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });
  try {
    const result = await pool.query(
      `INSERT INTO leads (campaign_id, user_id, name, email, phone, company, job_title, industry, linkedin_url, status, notes, source, assigned_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [campaign_id || null, req.user.id, name, email, phone, company, job_title, industry, linkedin_url, status || 'new', notes, source || 'linkedin', assigned_to || null]
    );
    if (campaign_id) {
      await pool.query('UPDATE campaigns SET leads_count = leads_count + 1 WHERE id = $1', [campaign_id]);
    }
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update lead
router.put('/:id', auth, noViewer, async (req, res) => {
  const { name, email, phone, company, job_title, industry, linkedin_url, status, notes, assigned_to } = req.body;
  const role = req.user.role;
  try {
    // Sales can only update status and notes on their assigned leads
    if (role === 'sales') {
      const result = await pool.query(
        `UPDATE leads SET status=$1, notes=$2, updated_at=NOW()
         WHERE id=$3 AND (assigned_to=$4 OR user_id=$4) RETURNING *`,
        [status, notes, req.params.id, req.user.id]
      );
      if (result.rows.length === 0) return res.status(403).json({ error: 'Not authorized to edit this lead' });
      return res.json(result.rows[0]);
    }
    // Admin and user can update everything
    const result = await pool.query(
      `UPDATE leads SET name=$1, email=$2, phone=$3, company=$4, job_title=$5, industry=$6, 
       linkedin_url=$7, status=$8, notes=$9, assigned_to=$10, updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [name, email, phone, company, job_title, industry, linkedin_url, status, notes, assigned_to || null, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete lead — admin and user only
router.delete('/:id', auth, async (req, res) => {
  if (!['admin', 'user'].includes(req.user.role))
    return res.status(403).json({ error: 'Not authorized to delete leads' });
  try {
    await pool.query('DELETE FROM leads WHERE id=$1', [req.params.id]);
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add activity — sales and above
router.post('/:id/activities', auth, noViewer, async (req, res) => {
  const { activity_type, description } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO lead_activities (lead_id, user_id, activity_type, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.id, req.user.id, activity_type, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get sales users for assignment dropdown
router.get('/meta/sales-users', auth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email FROM users WHERE role IN ('sales', 'user', 'admin') ORDER BY name"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;