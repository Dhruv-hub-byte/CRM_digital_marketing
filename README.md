# LinkedCRM — LinkedIn Marketing & Lead Generation Platform

A full-stack CRM platform built for LinkedIn marketing campaigns and lead collection.

**Stack:** React.js · Node.js (Express) · PostgreSQL (Neon)

---

## Features

- **Authentication** — JWT-based login/register with role-based access (admin / user)
- **Campaign Management** — Create, edit, track LinkedIn ad campaigns with status lifecycle
- **Lead CRM** — Collect, filter, update, and track leads across campaigns
- **Analytics Dashboard** — Visual charts (Recharts) for lead status and campaign performance
- **Admin Panel** — User management, role assignment, audit logs
- **Neon PostgreSQL** — 7 production-ready tables with auto-init on startup

---

## Project Structure

```
crm-platform/
├── backend/
│   ├── db/index.js          # DB connection + auto schema init
│   ├── middleware/auth.js    # JWT + admin guard
│   ├── routes/
│   │   ├── auth.js          # /api/auth/*
│   │   ├── campaigns.js     # /api/campaigns/*
│   │   ├── leads.js         # /api/leads/*
│   │   ├── analytics.js     # /api/analytics/dashboard
│   │   └── admin.js         # /api/admin/*
│   ├── server.js
│   └── .env.example
│
└── frontend/
    ├── public/index.html
    └── src/
        ├── api.js            # Axios API layer
        ├── context/AuthContext.js
        ├── components/
        │   ├── Sidebar.js
        │   └── Layout.js
        ├── pages/
        │   ├── Login.js
        │   ├── Register.js
        │   ├── Dashboard.js
        │   ├── Campaigns.js
        │   ├── Leads.js
        │   ├── Analytics.js
        │   ├── AdminUsers.js
        │   └── AdminLogs.js
        ├── index.css
        └── App.js
```

---

## Setup

### 1. Neon Database

1. Go to [neon.tech](https://neon.tech) → create a free project
2. Copy the **Connection string** (looks like `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`)

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env and paste your Neon connection string + a JWT secret
npm install
node server.js
```

The server auto-creates all 7 database tables on first run.

**Backend .env:**
```
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
JWT_SECRET=change_this_to_something_long_and_random
PORT=5000
FRONTEND_URL=http://localhost:3000
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000)

---

## First Admin User

Register normally, then run this in your Neon SQL editor to promote yourself:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |

### Campaigns
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/campaigns | List campaigns |
| POST | /api/campaigns | Create campaign |
| PUT | /api/campaigns/:id | Update campaign |
| DELETE | /api/campaigns/:id | Delete campaign |

### Leads
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/leads | List leads (with filters) |
| POST | /api/leads | Create lead |
| PUT | /api/leads/:id | Update lead |
| DELETE | /api/leads/:id | Delete lead |
| POST | /api/leads/:id/activities | Add activity |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/analytics/dashboard | Dashboard stats |

### Admin (admin role only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/users | All users |
| PUT | /api/admin/users/:id/role | Change role |
| DELETE | /api/admin/users/:id | Delete user |
| GET | /api/admin/logs | Audit logs |

---

## Database Tables

1. `users` — accounts with roles
2. `campaigns` — LinkedIn campaigns
3. `leads` — collected leads
4. `lead_activities` — lead interaction history
5. `campaign_analytics` — daily campaign metrics
6. `admin_logs` — audit trail
7. `automation_settings` — per-user automation config

---

## Deployment

**Backend (Railway / Render):**
- Set environment variables from `.env`
- Build command: `npm install`
- Start command: `node server.js`

**Frontend (Vercel):**
- Set `REACT_APP_API_URL=https://your-backend.railway.app/api`
- Build command: `npm run build`
- Output directory: `build`
- Add `vercel.json` for SPA routing:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```
