const bcrypt = require('bcryptjs');
const { db, initTables } = require('../_db');
const { cors } = require('../_auth');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await initTables();
    const { token, new_password } = req.body;
    if (!token||!new_password) return res.status(400).json({ error: 'Token and new password required' });
    if (new_password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const reset = await db.resets.findByToken(token);
    if (!reset) return res.status(400).json({ error: 'Invalid or expired reset link.' });
    const user   = await db.users.findByEmail(reset.email);
    const hashed = await bcrypt.hash(new_password, 12);
    await db.users.update(user.id, { password: hashed });
    await db.resets.markUsed(token);
    res.json({ message: 'Password reset successfully! You can now log in.' });
  } catch(err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};
