const { db, initTables } = require('../_db');
const { requireAuth, cors } = require('../_auth');

module.exports = requireAuth(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  await initTables();
  const listing = await db.listings.findById(parseInt(req.query.id));
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
  const bids = await db.bids.byListing(parseInt(req.query.id));
  res.json({ count: bids.length, bids });
});
