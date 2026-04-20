const bcrypt = require('bcryptjs');
const { db, initTables } = require('../_db');
const { requireAuth, cors } = require('../_auth');

module.exports = requireAuth(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await initTables();
    const { current_password, new_password } = req.body;
    if (!current_password||!new_password) return res.status(400).json({ error: 'Both passwords required' });
    if (new_password.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
    const user  = await db.users.findById(req.user.id);
    const match = await bcrypt.compare(current_password, user.password);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect.' });
    const hashed = await bcrypt.hash(new_password, 12);
    await db.users.update(req.user.id, { password: hashed });
    res.json({ message: 'Password updated successfully!' });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});
