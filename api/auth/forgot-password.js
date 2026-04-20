const crypto = require('crypto');
const { db, initTables } = require('../_db');
const mailer = require('../_mailer');
const { cors } = require('../_auth');
const FRONTEND = process.env.FRONTEND_URL || 'https://rytheraju.vercel.app';

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await initTables();
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const user = await db.users.findByEmail(email);
    if (!user) return res.json({ message: 'If this email is registered, you will receive a reset link shortly.' });
    const token     = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await db.resets.create(email, token, expiresAt);
    const resetLink = `${FRONTEND}?reset_token=${token}`;
    await mailer.sendPasswordReset(user, resetLink);
    res.json({ message: 'If this email is registered, you will receive a reset link shortly.' });
  } catch(err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};
