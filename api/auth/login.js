const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { db, initTables } = require('../_db');
const { cors } = require('../_auth');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await initTables();
    const { email, password } = req.body;
    if (!email||!password) return res.status(400).json({ error: 'Email and password required' });
    const user  = await db.users.findByEmail(email);
    if (!user||!user.is_active) return res.status(401).json({ error: 'Invalid email or password.' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid email or password.' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...safe } = user;
    res.json({ message: 'Login successful!', token, user: safe });
  } catch(err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};
