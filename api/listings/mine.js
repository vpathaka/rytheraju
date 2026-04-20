const { db, initTables } = require('../_db');
const { requireAuth, cors } = require('../_auth');

module.exports = requireAuth(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  await initTables();
  const listings = await db.listings.byUser(req.user.id);
  res.json({ count: listings.length, listings });
});
