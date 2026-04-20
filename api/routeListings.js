const express = require('express');
const { body, validationResult } = require('express-validator');
const { db }  = require('./db');
const authMW  = require('./authMiddleware');
const router  = express.Router();

router.get('/', async (req, res) => {
  const listings = await db.listings.allActive(req.query);
  res.json({ count: listings.length, listings });
});

router.get('/mine', authMW, async (req, res) => {
  const listings = await db.listings.byUser(req.user.id);
  res.json({ count: listings.length, listings });
});

router.get('/:id', async (req, res) => {
  const listing = await db.listings.findById(parseInt(req.params.id));
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  res.json({ listing });
});

router.post('/', authMW, [
  body('crop_name').trim().notEmpty().withMessage('Crop name is required'),
  body('quantity').isFloat({ gt:0 }).withMessage('Quantity must be > 0'),
  body('price').isFloat({ gt:0 }).withMessage('Price must be > 0'),
  body('location').trim().notEmpty().withMessage('Location is required'),
], async (req, res) => {
  if (req.user.role !== 'farmer') return res.status(403).json({ error: 'Only farmers can create listings.' });
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  const { crop_name, quantity, price, grade, location, district, description, photos } = req.body;
  // Validate photos size (max 3 photos, each max 500KB base64)
  if (photos && photos.length > 3) return res.status(400).json({ error: 'Maximum 3 photos allowed.' });
  const photosJson = photos && photos.length ? JSON.stringify(photos) : null;
  const listing = await db.listings.create({ user_id: req.user.id, crop_name, quantity: parseFloat(quantity), price: parseFloat(price), grade: grade||'A', location, district: district||req.user.district||null, description: description||null, photos: photosJson });
  res.status(201).json({ message: 'Listing created!', listing });
});

router.put('/:id', authMW, async (req, res) => {
  const listing = await db.listings.findById(parseInt(req.params.id));
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
  const updated = await db.listings.update(parseInt(req.params.id), req.body);
  res.json({ message: 'Listing updated!', listing: updated });
});

router.delete('/:id', authMW, async (req, res) => {
  const listing = await db.listings.findById(parseInt(req.params.id));
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
  await db.listings.delete(parseInt(req.params.id));
  res.json({ message: 'Listing deleted.' });
});

module.exports = router;
