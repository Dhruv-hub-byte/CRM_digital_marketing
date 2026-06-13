const express = require('express');
const router = express.Router();
const axios = require('axios');
const { auth } = require('../middleware/auth');
const { pool } = require('../db');

const LI_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LI_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI;

// Start OAuth flow
router.post('/connect', auth, async (req, res) => {
  try {
    const scope = 'r_ads rw_ads r_ads_reporting';
    const state = req.user.id;
    const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LI_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scope)}&state=${state}`;
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LinkedIn callback
router.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code) return res.redirect(`${process.env.FRONTEND_URL}/linkedin?error=no_code`);
  try {
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

    const { access_token } = tokenRes.data;

    await pool.query(
      `INSERT INTO automation_settings (user_id, setting_key, setting_value, is_active)
       VALUES ($1, 'linkedin_token', $2, true)
       ON CONFLICT (user_id, setting_key)
       DO UPDATE SET setting_value=$2, is_active=true`,
      [state, access_token]
    );

    res.redirect(`${process.env.FRONTEND_URL}/linkedin?connected=true`);
  } catch (err) {
    console.error('LinkedIn OAuth error:', err.response?.data || err.message);
    res.redirect(`${process.env.FRONTEND_URL}/linkedin?error=auth_failed`);
  }
});

// Status
router.get('/status', auth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT setting_value FROM automation_settings WHERE user_id=$1 AND setting_key='linkedin_token'",
      [req.user.id]
    );
    res.json({ connected: result.rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Disconnect
router.delete('/disconnect', auth, async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM automation_settings WHERE user_id=$1 AND setting_key='linkedin_token'",
      [req.user.id]
    );
    res.json({ message: 'LinkedIn disconnected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ad accounts
router.get('/ad-accounts', auth, async (req, res) => {
  try {
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

// Campaigns
router.get('/campaigns/:accountId', auth, async (req, res) => {
  try {
    const tokenRow = await pool.query(
      "SELECT setting_value FROM automation_settings WHERE user_id=$1 AND setting_key='linkedin_token'",
      [req.user.id]
    );
    if (tokenRow.rows.length === 0)
      return res.status(401).json({ error: 'LinkedIn not connected' });

    const token = tokenRow.rows[0].setting_value;
    const { accountId } = req.params;
    const response = await axios.get(
      `https://api.linkedin.com/v2/adCampaignsV2?q=search&search.account.values[0]=urn:li:sponsoredAccount:${accountId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    res.json(response.data.elements || []);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Analytics
router.get('/analytics/:accountId', auth, async (req, res) => {
  try {
    const tokenRow = await pool.query(
      "SELECT setting_value FROM automation_settings WHERE user_id=$1 AND setting_key='linkedin_token'",
      [req.user.id]
    );
    if (tokenRow.rows.length === 0)
      return res.status(401).json({ error: 'LinkedIn not connected' });

    const token = tokenRow.rows[0].setting_value;
    const { accountId } = req.params;

    const end = new Date();
    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const response = await axios.get(
      `https://api.linkedin.com/v2/adAnalyticsV2?q=analytics&pivot=CAMPAIGN` +
      `&dateRange.start.day=${start.getDate()}&dateRange.start.month=${start.getMonth() + 1}&dateRange.start.year=${start.getFullYear()}` +
      `&dateRange.end.day=${end.getDate()}&dateRange.end.month=${end.getMonth() + 1}&dateRange.end.year=${end.getFullYear()}` +
      `&timeGranularity=MONTHLY&accounts[0]=urn:li:sponsoredAccount:${accountId}` +
      `&fields=impressions,clicks,costInLocalCurrency,leadGenerationMailContactInfoShares`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    res.json(response.data.elements || []);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

module.exports = router;