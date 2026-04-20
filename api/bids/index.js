const { db, initTables } = require('../_db');
const mailer = require('../_mailer');
const { requireAuth, cors } = require('../_auth');

module.exports = requireAuth(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  await initTables();
  if (req.user.role !== 'buyer') return res.status(403).json({ error: 'Only buyers can place bids.' });
  const { listing_id, bid_price, quantity, message } = req.body;
  if (!listing_id||!bid_price) return res.status(400).json({ error: 'listing_id and bid_price required' });
  const listing = await db.listings.findById(parseInt(listing_id));
  if (!listing||listing.status!=='active') return res.status(404).json({ error: 'Listing not found or not active.' });
  const bid = await db.bids.create({ listing_id: parseInt(listing_id), buyer_id: req.user.id, bid_price: parseFloat(bid_price), quantity: quantity||null, message: message||null });
  try {
    const farmer = await db.users.findById(listing.user_id);
    const buyer  = await db.users.findById(req.user.id);
    mailer.sendBidNotificationToFarmer({ farmer, buyer, listing, bid }).catch(console.error);
    mailer.sendBidConfirmationToBuyer({ buyer, farmer, listing, bid }).catch(console.error);
  } catch(e) { console.error('Email error:', e.message); }
  res.status(201).json({ message: 'Bid placed!', bid });
});
