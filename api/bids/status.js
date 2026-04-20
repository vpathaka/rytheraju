const { db, initTables } = require('../_db');
const { requireAuth, cors } = require('../_auth');

module.exports = requireAuth(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
  await initTables();
  const { status } = req.body;
  if (!['accepted','rejected'].includes(status)) return res.status(400).json({ error: 'Status must be accepted or rejected' });
  const bid = await db.bids.findById(parseInt(req.query.id));
  if (!bid) return res.status(404).json({ error: 'Bid not found' });
  const listing = await db.listings.findById(bid.listing_id);
  if (listing.user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
  await db.bids.update(parseInt(req.query.id), { status });
  if (status === 'accepted') await db.listings.update(bid.listing_id, { status: 'sold' });
  res.json({ message: `Bid ${status}.` });
});
