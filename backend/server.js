require('dotenv').config();

console.log('DB URL loaded:', process.env.DATABASE_URL ? 'YES' : 'NO');

const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const { initDB } = require('./db');
const { sendWeeklyReports } = require('./utils/weeklyReport');
const app = express();

// Middleware
app.use(express.json());

app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://crm-digital-marketing.vercel.app",
    "https://crm-digital-marketing-6u4obwymz-dhruv-bansals-projects-32608c19.vercel.app"
  ],
  credentials: true
}));

// Swagger Documentation
app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true
  })
);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/linkedin', require('./routes/linkedin'));
app.use('/api/ads', require('./routes/ads'));

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'CRM API Server',
    version: '1.0.0',
    docs: '/api/docs',
    health: '/api/health'
  });
});

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;

// Start Server
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📖 Swagger Docs: http://localhost:${PORT}/api/docs`);
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });

  // Run weekly report every Monday at 9am
const checkWeeklyReport = () => {
  const now = new Date();
  if (now.getDay() === 1 && now.getHours() === 9 && now.getMinutes() === 0) {
    sendWeeklyReports();
  }
};
setInterval(checkWeeklyReport, 60 * 1000); // check every minute