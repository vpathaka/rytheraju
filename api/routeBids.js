const express = require('express');
const { body, validationResult } = require('express-validator');
const { db }  = require('./db');
const mailer  = require('./mailer');
const authMW  = require('./authMiddleware');
const router  = express.Router();

router.post('/', authMW, [
  body('listing_id').isInt().withMessage('Valid listing ID required'),
  body('bid_price').isFloat({ gt:0 }).withMessage('Bid price must be > 0'),
], async (req, res) => {
  if (req.user.role !== 'buyer') return res.status(403).json({ error: 'Only buyers can place bids.' });
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  const { listing_id, bid_price, quantity, message } = req.body;
  const listing = await db.listings.findById(parseInt(listing_id));
  if (!listing || listing.status !== 'active') return res.status(404).json({ error: 'Listing not found or no longer active.' });
  const bid = await db.bids.create({ listing_id: parseInt(listing_id), buyer_id: req.user.id, bid_price: parseFloat(bid_price), quantity: quantity||null, message: message||null });

  // Send email notifications (non-blocking)
  try {
    const farmer = await db.users.findById(listing.user_id);
    const buyer  = await db.users.findById(req.user.id);
    mailer.sendBidNotificationToFarmer({ farmer, buyer, listing, bid }).catch(console.error);
    mailer.sendBidConfirmationToBuyer({ buyer, farmer, listing, bid }).catch(console.error);
  } catch(e) { console.error('Email notification error:', e.message); }

  res.status(201).json({ message: 'Bid placed!', bid });
});

router.get('/listing/:id', authMW, async (req, res) => {
  const listing = await db.listings.findById(parseInt(req.params.id));
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
  const bids = await db.bids.byListing(parseInt(req.params.id));
  res.json({ count: bids.length, bids });
});

router.get('/mine', authMW, async (req, res) => {
  const bids = await db.bids.byBuyer(req.user.id);
  res.json({ count: bids.length, bids });
});

router.put('/:id/status', authMW, async (req, res) => {
  const { status } = req.body;
  if (!['accepted','rejected'].includes(status)) return res.status(400).json({ error: 'Status must be accepted or rejected' });
  const bid = await db.bids.findById(parseInt(req.params.id));
  if (!bid) return res.status(404).json({ error: 'Bid not found' });
  const listing = await db.listings.findById(bid.listing_id);
  if (listing.user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
  await db.bids.update(parseInt(req.params.id), { status });
  if (status === 'accepted') await db.listings.update(bid.listing_id, { status: 'sold' });
  res.json({ message: `Bid ${status}.` });
});

module.exports = router;
