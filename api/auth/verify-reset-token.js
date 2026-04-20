const { db, initTables } = require('../_db');
const { cors } = require('../_auth');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    await initTables();
    const token = req.query.token;
    if (!token) return res.status(400).json({ valid: false });
    const reset = await db.resets.findByToken(token);
    if (!reset) return res.status(400).json({ valid: false, error: 'Invalid or expired reset link.' });
    res.json({ valid: true, email: reset.email });
  } catch(err) {
    res.status(500).json({ valid: false, error: err.message });
  }
};
