const express = require('express');
const { db, query } = require('./db');
const authMW  = require('./authMiddleware');
const router  = express.Router();

router.get('/profile', authMW, async (req, res) => {
  try {
    const user = await db.users.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password, ...safe } = user;
    res.json({ user: safe });
  } catch (err) {
    console.error('Profile error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put('/profile', authMW, async (req, res) => {
  try {
    const { first_name, last_name, mobile, district, land_acres, company } = req.body;
    const updates = {};
    if (first_name) updates.first_name = first_name;
    if (last_name)  updates.last_name  = last_name;
    if (mobile)     updates.mobile     = mobile;
    if (district)   updates.district   = district;
    if (land_acres) updates.land_acres = parseFloat(land_acres);
    if (company)    updates.company    = company;
    const updated = await db.users.update(req.user.id, updates);
    const { password, ...safe } = updated;
    res.json({ message: 'Profile updated!', user: safe });
  } catch (err) {
    console.error('Update profile error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/all', authMW, async (_req, res) => {
  try {
    const users = (await db.users.all()).map(({ password, ...u }) => u);
    res.json({ count: users.length, users });
  } catch (err) {
    console.error('All users error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Public stats
router.get('/stats', async (_req, res) => {
  try {
    const users   = await db.users.all();
    const farmers = users.filter(u => u.role === 'farmer');
    const buyers  = users.filter(u => u.role === 'buyer');
    const recent  = users.slice(0, 5).map(({ password, ...u }) => u);
    res.json({
      total_users:    users.length,
      total_farmers:  farmers.length,
      total_buyers:   buyers.length,
      recent_signups: recent
    });
  } catch (err) {
    console.error('Stats error:', err.message);
    res.status(500).json({ error: err.message, hint: 'DB may still be initializing, try again in 10 seconds' });
  }
});

// Admin delete user by email — use carefully!
router.delete('/delete/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const user  = await db.users.findByEmail(email);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await query('DELETE FROM users WHERE email = LOWER($1)', [email]);
    res.json({ message: `User ${email} deleted successfully.` });
  } catch (err) {
    console.error('Delete user error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
