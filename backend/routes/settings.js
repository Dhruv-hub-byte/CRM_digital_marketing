const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

router.get('/profile', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, company, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/profile', auth, async (req, res) => {
  const { name, company } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    const result = await pool.query(
      'UPDATE users SET name=$1, company=$2, updated_at=NOW() WHERE id=$3 RETURNING id, name, email, role, company',
      [name, company || null, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/password', auth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password)
    return res.status(400).json({ error: 'Both fields are required' });
  if (new_password.length < 6)
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  try {
    const result = await pool.query('SELECT password FROM users WHERE id=$1', [req.user.id]);
    const valid = await bcrypt.compare(current_password, result.rows[0].password);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
    const hashed = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password=$1, updated_at=NOW() WHERE id=$2', [hashed, req.user.id]);
    res.json({ message: 'Password updated successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/automation', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM automation_settings WHERE user_id=$1', [req.user.id]);
    const settings = {};
    result.rows.forEach(r => { settings[r.setting_key] = { value: r.setting_value, is_active: r.is_active }; });
    res.json(settings);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/automation', auth, async (req, res) => {
  const { setting_key, setting_value, is_active } = req.body;
  if (!setting_key) return res.status(400).json({ error: 'setting_key is required' });
  try {
    await pool.query(
      `INSERT INTO automation_settings (user_id, setting_key, setting_value, is_active)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, setting_key)
       DO UPDATE SET setting_value=$3, is_active=$4`,
      [req.user.id, setting_key, setting_value, is_active]
    );
    res.json({ message: 'Setting saved' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/admin/users', auth, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, company, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/admin/system', auth, adminOnly, async (req, res) => {
  try {
    const [users, campaigns, leads] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM users'),
      pool.query('SELECT COUNT(*) as total FROM campaigns'),
      pool.query('SELECT COUNT(*) as total FROM leads'),
    ]);
    res.json({
      totalUsers: parseInt(users.rows[0].total),
      totalCampaigns: parseInt(campaigns.rows[0].total),
      totalLeads: parseInt(leads.rows[0].total),
      nodeVersion: process.version,
      uptime: Math.floor(process.uptime()) + 's',
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;