const express = require('express');
const router = express.Router();
const axios = require('axios');
const { auth } = require('../middleware/auth');

const LI_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LI_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI;

// Step 1: Redirect user to LinkedIn OAuth
router.get('/auth', auth, (req, res) => {
  const scope = 'r_ads,rw_ads,r_ads_reporting';
  const state = req.user.id;
  const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LI_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scope)}&state=${state}`;
  res.json({ url });
});

// Step 2: LinkedIn redirects back here with a code
router.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  try {
    // Exchange code for access token
    const tokenRes = await axios.post(
      'https://www.linkedin.com/oauth/v2/accessToken',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: LI_CLIENT_ID,
        client_secret: LI_CLIENT_SECRET,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, expires_in } = tokenRes.data;

    // Save token to DB for this user
    const { pool } = require('../db');
    await pool.query(
      `INSERT INTO automation_settings (user_id, setting_key, setting_value, is_active)
       VALUES ($1, 'linkedin_token', $2, true)
       ON CONFLICT (user_id, setting_key)
       DO UPDATE SET setting_value=$2`,
      [state, access_token]
    );

    // Redirect to frontend settings page
    res.redirect(`${process.env.FRONTEND_URL}/settings?linkedin=connected`);
  } catch (err) {
    console.error('LinkedIn OAuth error:', err.response?.data || err.message);
    res.redirect(`${process.env.FRONTEND_URL}/settings?linkedin=error`);
  }
});

// Get LinkedIn Ad Accounts
router.get('/ad-accounts', auth, async (req, res) => {
  try {
    const { pool } = require('../db');
    const tokenRow = await pool.query(
      "SELECT setting_value FROM automation_settings WHERE user_id=$1 AND setting_key='linkedin_token'",
      [req.user.id]
    );
    if (tokenRow.rows.length === 0)
      return res.status(401).json({ error: 'LinkedIn not connected' });

    const token = tokenRow.rows[0].setting_value;
    const response = await axios.get(
      'https://api.linkedin.com/v2/adAccountsV2?q=search&search.type.values[0]=BUSINESS&search.status.values[0]=ACTIVE',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    res.json(response.data.elements || []);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Get campaigns from LinkedIn
router.get('/campaigns/:adAccountId', auth, async (req, res) => {
  try {
    const { pool } = require('../db');
    const tokenRow = await pool.query(
      "SELECT setting_value FROM automation_settings WHERE user_id=$1 AND setting_key='linkedin_token'",
      [req.user.id]
    );
    if (tokenRow.rows.length === 0)
      return res.status(401).json({ error: 'LinkedIn not connected' });

    const token = tokenRow.rows[0].setting_value;
    const { adAccountId } = req.params;

    const response = await axios.get(
      `https://api.linkedin.com/v2/adCampaignsV2?q=search&search.account.values[0]=urn:li:sponsoredAccount:${adAccountId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    res.json(response.data.elements || []);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Get campaign analytics from LinkedIn
router.get('/analytics/:adAccountId', auth, async (req, res) => {
  try {
    const { pool } = require('../db');
    const tokenRow = await pool.query(
      "SELECT setting_value FROM automation_settings WHERE user_id=$1 AND setting_key='linkedin_token'",
      [req.user.id]
    );
    if (tokenRow.rows.length === 0)
      return res.status(401).json({ error: 'LinkedIn not connected' });

    const token = tokenRow.rows[0].setting_value;
    const { adAccountId } = req.params;
    const today = new Date().toISOString().split('T')[0].replace(/-/g, ',');
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0].replace(/-/g, ',');

    const response = await axios.get(
      `https://api.linkedin.com/v2/adAnalyticsV2?q=analytics&pivot=CAMPAIGN&dateRange.start.day=${monthAgo.split(',')[2]}&dateRange.start.month=${monthAgo.split(',')[1]}&dateRange.start.year=${monthAgo.split(',')[0]}&dateRange.end.day=${today.split(',')[2]}&dateRange.end.month=${today.split(',')[1]}&dateRange.end.year=${today.split(',')[0]}&timeGranularity=MONTHLY&accounts[0]=urn:li:sponsoredAccount:${adAccountId}&fields=impressions,clicks,costInLocalCurrency,leadGenerationMailContactInfoShares`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    res.json(response.data.elements || []);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Check if LinkedIn is connected
router.get('/status', auth, async (req, res) => {
  try {
    const { pool } = require('../db');
    const result = await pool.query(
      "SELECT setting_value FROM automation_settings WHERE user_id=$1 AND setting_key='linkedin_token'",
      [req.user.id]
    );
    res.json({ connected: result.rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Disconnect LinkedIn
router.delete('/disconnect', auth, async (req, res) => {
  try {
    const { pool } = require('../db');
    await pool.query(
      "DELETE FROM automation_settings WHERE user_id=$1 AND setting_key='linkedin_token'",
      [req.user.id]
    );
    res.json({ message: 'LinkedIn disconnected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;