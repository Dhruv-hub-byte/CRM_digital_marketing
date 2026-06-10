const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

// All routes require admin
router.use(auth, adminOnly);

// Get all users
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, company, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user role
router.put('/users/:id/role', async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'user', 'sales', 'viewer'].includes(role))
    return res.status(400).json({ error: 'Invalid role' });
  try {
    const result = await pool.query(
      'UPDATE users SET role=$1 WHERE id=$2 RETURNING id, name, email, role',
      [role, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get audit logs
router.get('/logs', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT al.*, u.name as admin_name FROM admin_logs al LEFT JOIN users u ON al.admin_id = u.id ORDER BY al.created_at DESC LIMIT 100'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// System stats
router.get('/stats', async (req, res) => {
  try {
    const [users, campaigns, leads] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM users'),
      pool.query('SELECT COUNT(*) as total, status, COUNT(*) FROM campaigns GROUP BY status'),
      pool.query('SELECT COUNT(*) as total FROM leads'),
    ]);
    res.json({
      totalUsers: parseInt(users.rows[0].total),
      campaignsByStatus: campaigns.rows,
      totalLeads: parseInt(leads.rows[0].total),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
