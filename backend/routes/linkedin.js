const express = require('express');
const router = express.Router();
const axios = require('axios');
const { auth } = require('../middleware/auth');
const { pool } = require('../db');

const LI_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LI_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI;
const AD_ACCOUNT_ID = process.env.LINKEDIN_AD_ACCOUNT_ID;

// Helper to get user token
const getToken = async (userId) => {
  const result = await pool.query(
    "SELECT setting_value FROM automation_settings WHERE user_id=$1 AND setting_key='linkedin_token'",
    [userId]
  );
  if (result.rows.length === 0) throw new Error('LinkedIn not connected');
  return result.rows[0].setting_value;
};

// OAuth start
router.post('/connect', auth, async (req, res) => {
  try {
    const scope = 'r_ads rw_ads r_ads_reporting w_organization_social r_organization_social';
    const state = req.user.id;
    const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LI_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scope)}&state=${state}`;
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// OAuth callback
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

// Get ad accounts
router.get('/ad-accounts', auth, async (req, res) => {
  try {
    const token = await getToken(req.user.id);
    const response = await axios.get(
      'https://api.linkedin.com/v2/adAccountsV2?q=search&search.type.values[0]=BUSINESS&search.status.values[0]=ACTIVE',
      { headers: { Authorization: `Bearer ${token}`, 'LinkedIn-Version': '202401' } }
    );
    res.json(response.data.elements || []);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Get campaigns
router.get('/campaigns/:accountId', auth, async (req, res) => {
  try {
    const token = await getToken(req.user.id);
    const { accountId } = req.params;
    const response = await axios.get(
      `https://api.linkedin.com/v2/adCampaignsV2?q=search&search.account.values[0]=urn:li:sponsoredAccount:${accountId}`,
      { headers: { Authorization: `Bearer ${token}`, 'LinkedIn-Version': '202401' } }
    );
    res.json(response.data.elements || []);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Create campaign on LinkedIn
router.post('/campaigns', auth, async (req, res) => {
  const { name, objective, budget, start_date, end_date, account_id } = req.body;
  if (!name || !objective) return res.status(400).json({ error: 'Name and objective required' });

  try {
    const token = await getToken(req.user.id);
    const accountId = account_id || AD_ACCOUNT_ID;

    const campaignData = {
      account: `urn:li:sponsoredAccount:${accountId}`,
      name,
      status: 'DRAFT',
      type: 'SPONSORED_UPDATES',
      costType: 'CPM',
      unitCost: {
        amount: String(budget || 10),
        currencyCode: 'USD',
      },
      targeting: {
        includedTargetingFacets: {
          interfaceLocales: [{ language: 'en', country: 'US' }],
        },
      },
      objectiveType: objective === 'Lead Generation' ? 'LEAD_GENERATION' :
                     objective === 'Brand Awareness' ? 'BRAND_AWARENESS' :
                     objective === 'Website Traffic' ? 'WEBSITE_VISITS' : 'BRAND_AWARENESS',
      runSchedule: {
        start: start_date ? new Date(start_date).getTime() : Date.now(),
        end: end_date ? new Date(end_date).getTime() : null,
      },
    };

    const response = await axios.post(
      'https://api.linkedin.com/v2/adCampaignsV2',
      campaignData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'LinkedIn-Version': '202401',
        }
      }
    );

    // Save to your DB too
    const saved = await pool.query(
      `INSERT INTO campaigns (user_id, name, objective, budget, start_date, end_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft') RETURNING *`,
      [req.user.id, name, objective, budget || 0, start_date, end_date]
    );

    res.status(201).json({
      local: saved.rows[0],
      linkedin: response.data,
      message: 'Campaign created on LinkedIn successfully',
    });
  } catch (err) {
    console.error('LinkedIn create campaign error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Publish ad to LinkedIn
router.post('/publish-ad', auth, async (req, res) => {
  const { ad_copy, loom_url, campaign_id, account_id } = req.body;
  if (!ad_copy) return res.status(400).json({ error: 'Ad copy required' });

  try {
    const token = await getToken(req.user.id);
    const accountId = account_id || AD_ACCOUNT_ID;

    // Step 1 — Get organization ID
    const orgRes = await axios.get(
      `https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR`,
      { headers: { Authorization: `Bearer ${token}`, 'LinkedIn-Version': '202401' } }
    );

    const orgId = orgRes.data?.elements?.[0]?.organization?.split(':').pop();
    if (!orgId) return res.status(400).json({ error: 'No LinkedIn organization found' });

    // Step 2 — Create share/post
    const shareData = {
      author: `urn:li:organization:${orgId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: ad_copy },
          shareMediaCategory: loom_url ? 'ARTICLE' : 'NONE',
          ...(loom_url && {
            media: [{
              status: 'READY',
              originalUrl: loom_url,
              title: { text: 'Watch our video' },
            }]
          }),
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    const shareRes = await axios.post(
      'https://api.linkedin.com/v2/ugcPosts',
      shareData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'LinkedIn-Version': '202401',
        }
      }
    );

    const postId = shareRes.data?.id;

    // Step 3 — Update local ad status
    if (campaign_id) {
      await pool.query(
        `UPDATE marketing_ads SET status='published', published_at=NOW() WHERE id=$1`,
        [campaign_id]
      );
    }

    res.json({
      success: true,
      post_id: postId,
      message: 'Ad published to LinkedIn successfully',
      linkedin_post_url: `https://www.linkedin.com/feed/update/${postId}`,
    });
  } catch (err) {
    console.error('LinkedIn publish error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// Analytics
router.get('/analytics/:accountId', auth, async (req, res) => {
  try {
    const token = await getToken(req.user.id);
    const { accountId } = req.params;

    const end = new Date();
    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const response = await axios.get(
      `https://api.linkedin.com/v2/adAnalyticsV2?q=analytics&pivot=CAMPAIGN` +
      `&dateRange.start.day=${start.getDate()}&dateRange.start.month=${start.getMonth() + 1}&dateRange.start.year=${start.getFullYear()}` +
      `&dateRange.end.day=${end.getDate()}&dateRange.end.month=${end.getMonth() + 1}&dateRange.end.year=${end.getFullYear()}` +
      `&timeGranularity=MONTHLY&accounts[0]=urn:li:sponsoredAccount:${accountId}` +
      `&fields=impressions,clicks,costInLocalCurrency,leadGenerationMailContactInfoShares`,
      { headers: { Authorization: `Bearer ${token}`, 'LinkedIn-Version': '202401' } }
    );
    res.json(response.data.elements || []);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

module.exports = router;