const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { db, initTables } = require('../_db');
const mailer = require('../_mailer');
const { cors } = require('../_auth');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await initTables();
    const { first_name, last_name, email, mobile, role, password, district, land_acres, company } = req.body;
    if (!first_name||!last_name||!email||!mobile||!role||!password) return res.status(400).json({ error: 'All fields are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (role === 'farmer' && !district) return res.status(400).json({ error: 'District is required for farmers' });
    const existing = await db.users.findByEmail(email);
    if (existing) return res.status(409).json({ error: 'This email is already registered. Please sign in.' });
    const hashed  = await bcrypt.hash(password, 12);
    const newUser = await db.users.create({ first_name, last_name, email, mobile, role, password: hashed, district, land_acres, company });
    const token   = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    console.log(`📧 Sending welcome email to ${newUser.email} as ${newUser.role}`);
    if (newUser.role === 'farmer') mailer.sendFarmerWelcome(newUser).catch(console.error);
    else if (newUser.role === 'buyer') mailer.sendBuyerWelcome(newUser).catch(console.error);
    const { password: _, ...safe } = newUser;
    res.status(201).json({ message: 'Account created successfully!', token, user: safe });
  } catch(err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
};
