// routes/mandi.js — Live mandi prices from data.gov.in
const express = require('express');
const axios   = require('axios');
const router  = express.Router();

const API_KEY      = process.env.MANDI_API_KEY || '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';
const RESOURCE_ID  = '9ef84268-d588-465a-a308-a864a43d0070';
const BASE_URL     = `https://api.data.gov.in/resource/${RESOURCE_ID}`;

// ── Cache (6 hours) ───────────────────────────────────────────────────────────
let cache = { data: null, fetchedAt: null };
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours in ms

function isCacheValid() {
  return cache.data && cache.fetchedAt && (Date.now() - cache.fetchedAt < CACHE_TTL);
}

// ── Fetch from data.gov.in ────────────────────────────────────────────────────
async function fetchMandiPrices() {
  console.log('🌾 Fetching live mandi prices from data.gov.in...');
  const states = ['Andhra Pradesh', 'Telangana'];
  const allRecords = [];

  for (const state of states) {
    try {
      const res = await axios.get(BASE_URL, {
        params: {
          'api-key':          API_KEY,
          format:             'json',
          limit:              100,
          'filters[state]':   state,
        },
        timeout: 15000,
      });
      if (res.data?.records) {
        allRecords.push(...res.data.records);
        console.log(`✅ Fetched ${res.data.records.length} records for ${state}`);
      }
    } catch (err) {
      console.error(`❌ Error fetching ${state}:`, err.message);
    }
  }

  return allRecords;
}

// ── Format records ────────────────────────────────────────────────────────────
function formatRecord(r) {
  return {
    state:       r.state,
    district:    r.district,
    market:      r.market,
    commodity:   r.commodity,
    variety:     r.variety || '',
    grade:       r.grade   || '',
    min_price:   parseFloat(r.min_price)   || 0,
    max_price:   parseFloat(r.max_price)   || 0,
    modal_price: parseFloat(r.modal_price) || 0,
    date:        r.arrival_date || r.date || '',
  };
}

// ── GET /api/mandi — all prices ───────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    // Return cached data if valid
    if (isCacheValid()) {
      console.log('📦 Returning cached mandi prices');
      return res.json({
        source:     'data.gov.in (cached)',
        fetched_at: new Date(cache.fetchedAt).toISOString(),
        count:      cache.data.length,
        records:    cache.data,
      });
    }

    // Fetch fresh data
    const records = await fetchMandiPrices();

    if (!records.length) {
      // Return cache even if stale, better than empty
      if (cache.data) {
        return res.json({
          source:     'data.gov.in (stale cache)',
          fetched_at: new Date(cache.fetchedAt).toISOString(),
          count:      cache.data.length,
          records:    cache.data,
        });
      }
      return res.status(503).json({ error: 'Unable to fetch live prices. Try again later.' });
    }

    const formatted = records.map(formatRecord);
    cache = { data: formatted, fetchedAt: Date.now() };

    res.json({
      source:     'data.gov.in (live)',
      fetched_at: new Date().toISOString(),
      count:      formatted.length,
      records:    formatted,
    });
  } catch (err) {
    console.error('Mandi prices error:', err.message);
    res.status(500).json({ error: 'Failed to fetch mandi prices.' });
  }
});

// ── GET /api/mandi/search?commodity=Tomato&district=Guntur ───────────────────
router.get('/search', async (req, res) => {
  try {
    const { commodity, district, state } = req.query;

    // Use cache or fetch
    let records = isCacheValid() ? cache.data : null;
    if (!records) {
      const raw = await fetchMandiPrices();
      records = raw.map(formatRecord);
      cache   = { data: records, fetchedAt: Date.now() };
    }

    // Filter
    let filtered = records;
    if (commodity) filtered = filtered.filter(r => r.commodity.toLowerCase().includes(commodity.toLowerCase()));
    if (district)  filtered = filtered.filter(r => r.district.toLowerCase().includes(district.toLowerCase()));
    if (state)     filtered = filtered.filter(r => r.state.toLowerCase().includes(state.toLowerCase()));

    res.json({
      source:  'data.gov.in',
      count:   filtered.length,
      records: filtered,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/mandi/refresh — force refresh cache ─────────────────────────────
router.get('/refresh', async (req, res) => {
  try {
    cache = { data: null, fetchedAt: null };
    const records  = await fetchMandiPrices();
    const formatted = records.map(formatRecord);
    cache = { data: formatted, fetchedAt: Date.now() };
    res.json({ message: 'Cache refreshed!', count: formatted.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
