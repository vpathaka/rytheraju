const express  = require('express');
const crypto   = require('crypto');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { db }   = require('./db');
const mailer   = require('./mailer');
const FRONTEND = process.env.FRONTEND_URL || 'https://rytheraju.netlify.app';
const authMW   = require('./authMiddleware');
const router   = express.Router();

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}
function safeUser(u) { const { password, ...rest } = u; return rest; }

// POST /api/auth/register
router.post('/register', [
  body('first_name').trim().notEmpty().withMessage('First name is required'),
  body('last_name').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('mobile').trim().notEmpty().withMessage('Mobile number required'),
  body('role').isIn(['farmer','buyer']).withMessage('Role must be farmer or buyer'),
  body('password').isLength({ min:8 }).withMessage('Password must be at least 8 characters'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  const { first_name, last_name, email, mobile, role, password, district, land_acres, company } = req.body;
  if (role === 'farmer' && !district)
    return res.status(400).json({ error: 'District is required for farmers' });
  try {
    const existing = await db.users.findByEmail(email);
    if (existing) return res.status(409).json({ error: 'This email is already registered. Please sign in.' });
    const hashed  = await bcrypt.hash(password, 12);
    const newUser = await db.users.create({ first_name, last_name, email, mobile, role, password: hashed, district, land_acres, company });
    const token   = signToken(newUser);
    // Send welcome email (non-blocking)
    console.log(`📧 Sending welcome email to ${newUser.email} as ${newUser.role}`);
    if (newUser.role === 'farmer') mailer.sendFarmerWelcome(newUser).catch(console.error);
    else if (newUser.role === 'buyer') mailer.sendBuyerWelcome(newUser).catch(console.error);
    res.status(201).json({ message: 'Account created successfully!', token, user: safeUser(newUser) });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  const { email, password } = req.body;
  try {
    const user  = await db.users.findByEmail(email);
    if (!user || !user.is_active) return res.status(401).json({ error: 'Invalid email or password.' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid email or password.' });
    const token = signToken(user);
    res.json({ message: 'Login successful!', token, user: safeUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// GET /api/auth/me
router.get('/me', authMW, (req, res) => res.json({ user: req.user }));

// PUT /api/auth/change-password
router.put('/change-password', authMW, [
  body('current_password').notEmpty().withMessage('Current password required'),
  body('new_password').isLength({ min:8 }).withMessage('New password must be at least 8 characters'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  const { current_password, new_password } = req.body;
  try {
    const user  = await db.users.findById(req.user.id);
    const match = await bcrypt.compare(current_password, user.password);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect.' });
    const hashed = await bcrypt.hash(new_password, 12);
    await db.users.update(req.user.id, { password: hashed });
    res.json({ message: 'Password updated successfully!' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { email } = req.body;
  try {
    const user = await db.users.findByEmail(email);
    // Always return success to prevent email enumeration
    if (!user) return res.json({ message: 'If this email is registered, you will receive a reset link shortly.' });

    // Generate secure token
    const token     = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await db.resets.create(email, token, expiresAt);

    const resetLink = `${FRONTEND}?reset_token=${token}`;
    await mailer.sendPasswordReset(user, resetLink);
    console.log('✅ Password reset link sent to:', email);

    res.json({ message: 'If this email is registered, you will receive a reset link shortly.' });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token required'),
  body('new_password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { token, new_password } = req.body;
  try {
    const reset = await db.resets.findByToken(token);
    if (!reset) return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });

    const hashed = await bcrypt.hash(new_password, 12);
    await db.users.update((await db.users.findByEmail(reset.email)).id, { password: hashed });
    await db.resets.markUsed(token);

    res.json({ message: 'Password reset successfully! You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// GET /api/auth/verify-reset-token/:token
router.get('/verify-reset-token/:token', async (req, res) => {
  const reset = await db.resets.findByToken(req.params.token);
  if (!reset) return res.status(400).json({ valid: false, error: 'Invalid or expired reset link.' });
  res.json({ valid: true, email: reset.email });
});

module.exports = router;
