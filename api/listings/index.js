const { db, initTables } = require('../_db');
const { requireAuth, cors, verifyToken } = require('../_auth');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  await initTables();

  if (req.method === 'GET') {
    const listings = await db.listings.allActive(req.query);
    return res.json({ count: listings.length, listings });
  }

  if (req.method === 'POST') {
    const user = await verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Please log in.' });
    if (user.role !== 'farmer') return res.status(403).json({ error: 'Only farmers can create listings.' });
    const { crop_name, quantity, price, grade, location, district, description, photos } = req.body;
    if (!crop_name||!quantity||!price||!location) return res.status(400).json({ error: 'Required fields missing' });
    if (photos && photos.length > 3) return res.status(400).json({ error: 'Maximum 3 photos allowed.' });
    const photosJson = photos?.length ? JSON.stringify(photos) : null;
    const listing = await db.listings.create({ user_id: user.id, crop_name, quantity: parseFloat(quantity), price: parseFloat(price), grade: grade||'A', location, district: district||null, description: description||null, photos: photosJson });
    return res.status(201).json({ message: 'Listing created!', listing });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
