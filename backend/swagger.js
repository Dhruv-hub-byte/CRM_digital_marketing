const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'CRM Digital Marketing API',
    version: '1.0.0',
    description: 'API documentation for the CRM Digital Marketing Platform',
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string', enum: ['user', 'admin'] },
          company: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Campaign: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          user_id: { type: 'integer' },
          name: { type: 'string' },
          objective: { type: 'string' },
          status: { type: 'string', enum: ['draft', 'active', 'paused', 'completed'] },
          industry: { type: 'string' },
          location: { type: 'string' },
          audience_size: { type: 'integer' },
          budget: { type: 'number' },
          ad_copy: { type: 'string' },
          creative_url: { type: 'string' },
          start_date: { type: 'string', format: 'date' },
          end_date: { type: 'string', format: 'date' },
          impressions: { type: 'integer' },
          clicks: { type: 'integer' },
          leads_count: { type: 'integer' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Lead: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          campaign_id: { type: 'integer' },
          user_id: { type: 'integer' },
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          company: { type: 'string' },
          job_title: { type: 'string' },
          industry: { type: 'string' },
          linkedin_url: { type: 'string' },
          status: { type: 'string', enum: ['new', 'contacted', 'qualified', 'converted', 'lost'] },
          notes: { type: 'string' },
          source: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
    },
  },
  paths: {
    // ── AUTH ──────────────────────────────────────────────────
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'John Doe' },
                  email: { type: 'string', example: 'john@example.com' },
                  password: { type: 'string', example: 'secret123' },
                  company: { type: 'string', example: 'Acme Corp' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                    token: { type: 'string' },
                  },
                },
              },
            },
          },
          400: { description: 'Missing fields or email already registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login and get JWT token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'john@example.com' },
                  password: { type: 'string', example: 'secret123' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                    token: { type: 'string' },
                  },
                },
              },
            },
          },
          401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current logged-in user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Current user data', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          401: { description: 'Unauthorized' },
        },
      },
    },

    // ── CAMPAIGNS ─────────────────────────────────────────────
    '/api/campaigns': {
      get: {
        tags: ['Campaigns'],
        summary: 'Get all campaigns (admin sees all, user sees own)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'List of campaigns', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Campaign' } } } } },
        },
      },
      post: {
        tags: ['Campaigns'],
        summary: 'Create a new campaign',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', example: 'Summer Sale 2024' },
                  objective: { type: 'string', example: 'Brand Awareness' },
                  industry: { type: 'string', example: 'E-commerce' },
                  location: { type: 'string', example: 'India' },
                  audience_size: { type: 'integer', example: 50000 },
                  budget: { type: 'number', example: 10000 },
                  ad_copy: { type: 'string' },
                  creative_url: { type: 'string' },
                  start_date: { type: 'string', format: 'date' },
                  end_date: { type: 'string', format: 'date' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Campaign created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Campaign' } } } },
          400: { description: 'Campaign name is required' },
        },
      },
    },
    '/api/campaigns/{id}': {
      get: {
        tags: ['Campaigns'],
        summary: 'Get a single campaign by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Campaign data', content: { 'application/json': { schema: { $ref: '#/components/schemas/Campaign' } } } },
          404: { description: 'Campaign not found' },
        },
      },
      put: {
        tags: ['Campaigns'],
        summary: 'Update a campaign',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  objective: { type: 'string' },
                  status: { type: 'string', enum: ['draft', 'active', 'paused', 'completed'] },
                  industry: { type: 'string' },
                  location: { type: 'string' },
                  audience_size: { type: 'integer' },
                  budget: { type: 'number' },
                  ad_copy: { type: 'string' },
                  creative_url: { type: 'string' },
                  start_date: { type: 'string', format: 'date' },
                  end_date: { type: 'string', format: 'date' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Campaign updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Campaign' } } } },
          404: { description: 'Campaign not found' },
        },
      },
      delete: {
        tags: ['Campaigns'],
        summary: 'Delete a campaign',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Campaign deleted' },
          404: { description: 'Campaign not found' },
        },
      },
    },
    '/api/campaigns/{id}/analytics': {
      get: {
        tags: ['Campaigns'],
        summary: 'Get analytics for a specific campaign',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Campaign analytics (last 30 days)' },
        },
      },
    },

    // ── LEADS ─────────────────────────────────────────────────
    '/api/leads': {
      get: {
        tags: ['Leads'],
        summary: 'Get all leads with optional filters',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' }, description: 'Filter by lead status' },
          { name: 'campaign_id', in: 'query', schema: { type: 'integer' }, description: 'Filter by campaign' },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by name, email, or company' },
        ],
        responses: {
          200: { description: 'List of leads', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Lead' } } } } },
        },
      },
      post: {
        tags: ['Leads'],
        summary: 'Create a new lead',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email'],
                properties: {
                  campaign_id: { type: 'integer' },
                  name: { type: 'string', example: 'Jane Smith' },
                  email: { type: 'string', example: 'jane@company.com' },
                  phone: { type: 'string' },
                  company: { type: 'string' },
                  job_title: { type: 'string' },
                  industry: { type: 'string' },
                  linkedin_url: { type: 'string' },
                  status: { type: 'string', enum: ['new', 'contacted', 'qualified', 'converted', 'lost'] },
                  notes: { type: 'string' },
                  source: { type: 'string', example: 'linkedin' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Lead created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Lead' } } } },
          400: { description: 'Name and email are required' },
        },
      },
    },
    '/api/leads/{id}': {
      get: {
        tags: ['Leads'],
        summary: 'Get a single lead with activities',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Lead with activity history' },
          404: { description: 'Lead not found' },
        },
      },
      put: {
        tags: ['Leads'],
        summary: 'Update a lead',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                  phone: { type: 'string' },
                  company: { type: 'string' },
                  job_title: { type: 'string' },
                  industry: { type: 'string' },
                  linkedin_url: { type: 'string' },
                  status: { type: 'string' },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Lead updated' },
        },
      },
      delete: {
        tags: ['Leads'],
        summary: 'Delete a lead',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Lead deleted' },
        },
      },
    },
    '/api/leads/{id}/activities': {
      post: {
        tags: ['Leads'],
        summary: 'Add an activity to a lead',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  activity_type: { type: 'string', example: 'call' },
                  description: { type: 'string', example: 'Called and left voicemail' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Activity added' },
        },
      },
    },

    // ── ANALYTICS ─────────────────────────────────────────────
    '/api/analytics/dashboard': {
      get: {
        tags: ['Analytics'],
        summary: 'Get dashboard stats, recent leads and campaigns',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Dashboard data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    stats: {
                      type: 'object',
                      properties: {
                        totalCampaigns: { type: 'integer' },
                        totalLeads: { type: 'integer' },
                        activeCampaigns: { type: 'integer' },
                      },
                    },
                    leadStatusBreakdown: { type: 'array' },
                    recentLeads: { type: 'array' },
                    recentCampaigns: { type: 'array' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ── ADMIN ─────────────────────────────────────────────────
    '/api/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'Get all users (admin only)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'List of all users', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/User' } } } } },
          403: { description: 'Forbidden - Admin only' },
        },
      },
    },
    '/api/admin/users/{id}/role': {
      put: {
        tags: ['Admin'],
        summary: 'Update a user role (admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  role: { type: 'string', enum: ['admin', 'user'] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Role updated' },
          400: { description: 'Invalid role' },
        },
      },
    },
    '/api/admin/users/{id}': {
      delete: {
        tags: ['Admin'],
        summary: 'Delete a user (admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'User deleted' },
        },
      },
    },
    '/api/admin/logs': {
      get: {
        tags: ['Admin'],
        summary: 'Get audit logs (admin only)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Last 100 audit log entries' },
        },
      },
    },
    '/api/admin/stats': {
      get: {
        tags: ['Admin'],
        summary: 'Get system-wide stats (admin only)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Total users, campaigns, and leads' },
        },
      },
    },

    // ── SETTINGS ──────────────────────────────────────────────
    '/api/settings/profile': {
      get: {
        tags: ['Settings'],
        summary: 'Get current user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'User profile', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
        },
      },
      put: {
        tags: ['Settings'],
        summary: 'Update user profile (name and company)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  company: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Profile updated' },
        },
      },
    },
    '/api/settings/password': {
      put: {
        tags: ['Settings'],
        summary: 'Change user password',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['current_password', 'new_password'],
                properties: {
                  current_password: { type: 'string' },
                  new_password: { type: 'string', minLength: 6 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Password updated successfully' },
          401: { description: 'Current password is incorrect' },
        },
      },
    },
    '/api/settings/automation': {
      get: {
        tags: ['Settings'],
        summary: 'Get automation settings for current user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Key-value map of automation settings' },
        },
      },
      put: {
        tags: ['Settings'],
        summary: 'Save or update an automation setting',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['setting_key'],
                properties: {
                  setting_key: { type: 'string' },
                  setting_value: { type: 'string' },
                  is_active: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Setting saved' },
        },
      },
    },
    '/api/settings/admin/users': {
      get: {
        tags: ['Settings'],
        summary: 'Get all users - admin settings view',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'All users list' },
          403: { description: 'Forbidden' },
        },
      },
    },
    '/api/settings/admin/system': {
      get: {
        tags: ['Settings'],
        summary: 'Get system stats from settings (admin only)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'System stats',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    totalUsers: { type: 'integer' },
                    totalCampaigns: { type: 'integer' },
                    totalLeads: { type: 'integer' },
                    nodeVersion: { type: 'string' },
                    uptime: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ── HEALTH ────────────────────────────────────────────────
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check endpoint',
        responses: {
          200: {
            description: 'Server is running',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    time: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

module.exports = swaggerDefinition;