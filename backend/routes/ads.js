const express = require('express');
const router = express.Router();
const axios = require('axios');
const { pool } = require('../db');
const { auth, noViewer } = require('../middleware/auth');
const { sendEmail, isEnabled, getUserEmail, templates } = require('../utils/email');


// ─────────────────────────────────────────────
// STATIC ROUTES — must be above /:id
// ─────────────────────────────────────────────

// Get all templates
router.get('/templates', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ad_templates ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate ad copy with Groq AI
router.post('/generate-copy', auth, async (req, res) => {
  const { template_id, variables } = req.body;
  if (!template_id || !variables) return res.status(400).json({ error: 'Missing fields' });

  try {
    const template = await pool.query('SELECT * FROM ad_templates WHERE id = $1', [template_id]);
    if (template.rows.length === 0) return res.status(404).json({ error: 'Template not found' });

    const tmpl = template.rows[0];
    let prompt = `Generate a LinkedIn marketing ad copy based on this template:\n\n`;
    prompt += `Template: ${tmpl.structure}\n`;
    prompt += `Available placeholders: ${tmpl.placeholders.join(', ')}\n\n`;
    prompt += `User provided values:\n`;
    Object.entries(variables).forEach(([key, value]) => {
      prompt += `${key}: ${value}\n`;
    });
    prompt += `\nMake it compelling, concise (max 150 words), and LinkedIn-appropriate. No hashtags.`;

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.7,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    );

    const adCopy = response.data.choices[0].message.content.trim();
    res.json({ ad_copy: adCopy });
  } catch (err) {
    console.error('Groq error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// Get all ads
router.get('/', auth, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const query = isAdmin
      ? `SELECT ma.*, u.name as creator_name, at.name as template_name,
                c.name as campaign_name
         FROM marketing_ads ma
         LEFT JOIN users u ON ma.user_id = u.id
         LEFT JOIN ad_templates at ON ma.template_id = at.id
         LEFT JOIN campaigns c ON ma.campaign_id = c.id
         ORDER BY ma.created_at DESC`
      : `SELECT ma.*, u.name as creator_name, at.name as template_name,
                c.name as campaign_name
         FROM marketing_ads ma
         LEFT JOIN users u ON ma.user_id = u.id
         LEFT JOIN ad_templates at ON ma.template_id = at.id
         LEFT JOIN campaigns c ON ma.campaign_id = c.id
         WHERE ma.user_id = $1
         ORDER BY ma.created_at DESC`;

    const result = await pool.query(query, isAdmin ? [] : [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create ad
router.post('/', auth, noViewer, async (req, res) => {
  const { template_id, title, ad_copy, loom_url, status, external_ad_url, campaign_id } = req.body;
  if (!title || !ad_copy) return res.status(400).json({ error: 'Title and copy required' });

  try {
    const result = await pool.query(
      `INSERT INTO marketing_ads
        (user_id, template_id, title, ad_copy, loom_url, status, external_ad_url, campaign_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        req.user.id,
        template_id || null,
        title,
        ad_copy,
        loom_url || null,
        status || 'draft',
        external_ad_url || null,
        campaign_id || null,
      ]
    );

    // Audit log after insert — FK is valid here
    await pool.query(
      `INSERT INTO ad_audit_log (action, ad_id, creator_id, details)
       VALUES ('created', $1, $2, $3)`,
      [result.rows[0].id, req.user.id, JSON.stringify({ title: result.rows[0].title })]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: get all ads
router.get('/audit/all-ads', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const result = await pool.query(
      `SELECT ma.*, u.name as creator_name, at.name as template_name,
              c.name as campaign_name
       FROM marketing_ads ma
       LEFT JOIN users u ON ma.user_id = u.id
       LEFT JOIN ad_templates at ON ma.template_id = at.id
       LEFT JOIN campaigns c ON ma.campaign_id = c.id
       ORDER BY ma.published_at DESC NULLS LAST`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: audit log
router.get('/audit/logs', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const result = await pool.query(
      `SELECT aal.*, u.name as creator_name
       FROM ad_audit_log aal
       LEFT JOIN users u ON aal.creator_id = u.id
       ORDER BY aal.created_at DESC
       LIMIT 100`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: get pending approvals
router.get('/admin/pending', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const result = await pool.query(
      `SELECT ma.*, u.name as creator_name, u.email as creator_email,
              c.name as campaign_name, at.name as template_name
       FROM marketing_ads ma
       LEFT JOIN users u ON ma.user_id = u.id
       LEFT JOIN campaigns c ON ma.campaign_id = c.id
       LEFT JOIN ad_templates at ON ma.template_id = at.id
       WHERE ma.approval_status = 'pending_approval'
       ORDER BY ma.updated_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ─────────────────────────────────────────────
// DYNAMIC ROUTES — /:id must be below all static routes
// ─────────────────────────────────────────────

// Get single ad
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ma.*, u.name as creator_name, at.name as template_name,
              c.name as campaign_name
       FROM marketing_ads ma
       LEFT JOIN users u ON ma.user_id = u.id
       LEFT JOIN ad_templates at ON ma.template_id = at.id
       LEFT JOIN campaigns c ON ma.campaign_id = c.id
       WHERE ma.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Ad not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update ad
router.put('/:id', auth, noViewer, async (req, res) => {
  const { title, ad_copy, loom_url, status, external_ad_url, campaign_id } = req.body;
  const isAdmin = req.user.role === 'admin';
  try {
    const result = await pool.query(
      `UPDATE marketing_ads
       SET title=$1, ad_copy=$2, loom_url=$3, status=$4,
           external_ad_url=$5, campaign_id=$6, updated_at=NOW()
       WHERE id=$7 AND (user_id=$8 OR $9::boolean)
       RETURNING *`,
      [
        title,
        ad_copy,
        loom_url || null,
        status,
        external_ad_url || null,
        campaign_id || null,
        req.params.id,
        req.user.id,
        isAdmin,
      ]
    );
    if (result.rows.length === 0) return res.status(403).json({ error: 'Not authorized' });

    // Audit log — ad still exists so FK is valid
    await pool.query(
      `INSERT INTO ad_audit_log (action, ad_id, creator_id, details)
       VALUES ('updated', $1, $2, $3)`,
      [result.rows[0].id, req.user.id, JSON.stringify({ title: result.rows[0].title })]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Publish ad
router.post('/:id/publish', auth, noViewer, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE marketing_ads
       SET status='published', published_at=NOW(), updated_at=NOW()
       WHERE id=$1 AND user_id=$2
       RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(403).json({ error: 'Not authorized' });

    // Audit log — no admin_id column, removed
    await pool.query(
      `INSERT INTO ad_audit_log (action, ad_id, creator_id, details)
       VALUES ('published', $1, $2, $3)`,
      [result.rows[0].id, req.user.id, JSON.stringify({ title: result.rows[0].title })]
    );

    // Email — non-blocking
    try {
      const userInfo = await getUserEmail(pool, req.user.id);
      const enabled = await isEnabled(pool, req.user.id, 'email_notifications');
      if (userInfo && enabled) {
        const { subject, html } = templates.adPublished(userInfo.name, result.rows[0]);
        await sendEmail(userInfo.email, subject, html);
      }
    } catch (e) {
      console.error('Publish email error:', e.message);
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete ad
router.delete('/:id', auth, noViewer, async (req, res) => {
  try {
    // Fetch first so we have data for audit log before FK is gone
    const ad = await pool.query(
      'SELECT * FROM marketing_ads WHERE id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    if (ad.rows.length === 0) return res.status(403).json({ error: 'Not authorized' });

    // Audit log while FK still valid
    await pool.query(
      `INSERT INTO ad_audit_log (action, ad_id, creator_id, details)
       VALUES ('deleted', $1, $2, $3)`,
      [ad.rows[0].id, req.user.id, JSON.stringify({ title: ad.rows[0].title })]
    );

    // Now delete
    await pool.query('DELETE FROM marketing_ads WHERE id=$1', [req.params.id]);

    res.json({ message: 'Ad deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit ad for approval
router.post('/:id/submit', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE marketing_ads
       SET approval_status='pending_approval', updated_at=NOW()
       WHERE id=$1 AND user_id=$2
       RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(403).json({ error: 'Not authorized' });

    // Notify all admins — non-blocking, don't let email failure break the response
    pool.query("SELECT email, name FROM users WHERE role='admin'")
      .then(admins => {
        for (const admin of admins.rows) {
          sendEmail(
            admin.email,
            `Ad Pending Approval: ${result.rows[0].title}`,
            `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
              <h2 style="color:#0a66c2;">Ad Pending Your Approval</h2>
              <p>Hi ${admin.name},</p>
              <p><strong>${result.rows[0].title}</strong> has been submitted for approval.</p>
              <p><strong>Ad Copy:</strong></p>
              <p style="background:#f8fafc;padding:12px;border-radius:6px;">${result.rows[0].ad_copy}</p>
              <a href="${process.env.FRONTEND_URL}/admin/approvals"
                 style="background:#0a66c2;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;">
                Review Ad
              </a>
            </div>`
          ).catch(e => console.error('Admin notify email error:', e.message));
        }
      })
      .catch(e => console.error('Admin query error:', e.message));

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: approve ad
router.post('/:id/approve', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  try {
    const result = await pool.query(
      `UPDATE marketing_ads
       SET approval_status='approved', approved_by=$1,
           approved_at=NOW(), status='published', published_at=NOW(), updated_at=NOW()
       WHERE id=$2
       RETURNING *`,
      [req.user.id, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Ad not found' });

    // Notify creator — non-blocking
    pool.query(
      'SELECT u.email, u.name FROM users u JOIN marketing_ads ma ON ma.user_id = u.id WHERE ma.id=$1',
      [req.params.id]
    ).then(creator => {
      if (creator.rows.length > 0) {
        sendEmail(
          creator.rows[0].email,
          `✅ Your ad "${result.rows[0].title}" was approved`,
          `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:#10b981;">Ad Approved!</h2>
            <p>Hi ${creator.rows[0].name},</p>
            <p>Your ad <strong>${result.rows[0].title}</strong> has been approved and published.</p>
            <a href="${process.env.FRONTEND_URL}/ads"
               style="background:#0a66c2;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;">
              View Ad
            </a>
          </div>`
        ).catch(e => console.error('Approve email error:', e.message));
      }
    }).catch(e => console.error('Creator query error:', e.message));

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: reject ad
router.post('/:id/reject', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const { note } = req.body;
  try {
    const result = await pool.query(
      `UPDATE marketing_ads
       SET approval_status='rejected', approval_note=$1,
           approved_by=$2, approved_at=NOW(), updated_at=NOW()
       WHERE id=$3
       RETURNING *`,
      [note || 'No reason provided', req.user.id, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Ad not found' });

    // Notify creator — non-blocking
    pool.query(
      'SELECT u.email, u.name FROM users u JOIN marketing_ads ma ON ma.user_id = u.id WHERE ma.id=$1',
      [req.params.id]
    ).then(creator => {
      if (creator.rows.length > 0) {
        sendEmail(
          creator.rows[0].email,
          `❌ Your ad "${result.rows[0].title}" was rejected`,
          `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:#ef4444;">Ad Rejected</h2>
            <p>Hi ${creator.rows[0].name},</p>
            <p>Your ad <strong>${result.rows[0].title}</strong> was rejected.</p>
            <p><strong>Reason:</strong> ${note || 'No reason provided'}</p>
            <p>Please update your ad and resubmit.</p>
            <a href="${process.env.FRONTEND_URL}/ads"
               style="background:#0a66c2;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;">
              Edit Ad
            </a>
          </div>`
        ).catch(e => console.error('Reject email error:', e.message));
      }
    }).catch(e => console.error('Creator query error:', e.message));

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;