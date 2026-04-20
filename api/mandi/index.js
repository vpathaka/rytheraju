const axios = require('axios');
const { cors } = require('../_auth');

const SAMPLE_KEY  = '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';
const RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';

let cache = { data: null, fetchedAt: null };
const TTL = 6 * 60 * 60 * 1000;

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    if (cache.data && cache.fetchedAt && Date.now()-cache.fetchedAt < TTL) {
      return res.json({ source:'data.gov.in (cached)', fetched_at: new Date(cache.fetchedAt).toISOString(), count: cache.data.length, records: cache.data });
    }
    const key = process.env.MANDI_API_KEY || SAMPLE_KEY;
    const allRecords = [];
    for (const state of ['Andhra Pradesh','Telangana']) {
      try {
        const r = await axios.get(`https://api.data.gov.in/resource/${RESOURCE_ID}`, {
          params: { 'api-key': key, format:'json', limit:100, 'filters[state]': state },
          timeout: 15000
        });
        if (r.data?.records) allRecords.push(...r.data.records);
      } catch(e) { continue; }
    }
    if (!allRecords.length && cache.data) return res.json({ source:'data.gov.in (stale)', count: cache.data.length, records: cache.data });
    if (!allRecords.length) return res.status(503).json({ error: 'Unable to fetch live prices.' });
    const formatted = allRecords.map(r => ({
      state: r.state, district: r.district, market: r.market,
      commodity: r.commodity, variety: r.variety||'',
      min_price: parseFloat(r.min_price)||0, max_price: parseFloat(r.max_price)||0,
      modal_price: parseFloat(r.modal_price)||0, date: r.arrival_date||r.date||''
    }));
    cache = { data: formatted, fetchedAt: Date.now() };
    res.json({ source:'data.gov.in (live)', fetched_at: new Date().toISOString(), count: formatted.length, records: formatted });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
};
