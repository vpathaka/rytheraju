const { db, initTables } = require('../_db');
const { verifyToken, cors } = require('../_auth');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  await initTables();
  const id = parseInt(req.query.id);

  if (req.method === 'GET') {
    const listing = await db.listings.findById(id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    return res.json({ listing });
  }

  const user = await verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Please log in.' });

  if (req.method === 'PUT') {
    const listing = await db.listings.findById(id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.user_id !== user.id) return res.status(403).json({ error: 'Not authorized' });
    const updated = await db.listings.update(id, req.body);
    return res.json({ message: 'Listing updated!', listing: updated });
  }

  if (req.method === 'DELETE') {
    const listing = await db.listings.findById(id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.user_id !== user.id) return res.status(403).json({ error: 'Not authorized' });
    await db.listings.delete(id);
    return res.json({ message: 'Listing deleted.' });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
