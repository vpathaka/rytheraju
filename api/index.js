// api/index.js — Single Express app for Vercel
const express    = require('express');
const cors       = require('cors');
const { initDB } = require('./db');

const app = express();

app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'Rytheraju API', version: '1.0.0' }));

// Routes
app.use('/api/auth',     require('./routeAuth'));
app.use('/api/users',    require('./routeUsers'));
app.use('/api/listings', require('./routeListings'));
app.use('/api/bids',     require('./routeBids'));
app.use('/api/mandi',    require('./routeMandi'));

// 404
app.use('/api/*', (_req, res) => res.status(404).json({ error: 'Route not found' }));

// Init DB on first request
let dbInitialized = false;
const originalHandler = app;

module.exports = async (req, res) => {
  if (!dbInitialized) {
    try {
      await initDB();
      dbInitialized = true;
      console.log('✅ DB initialized');
    } catch (err) {
      console.error('❌ DB init error:', err.message);
    }
  }
  return originalHandler(req, res);
};
