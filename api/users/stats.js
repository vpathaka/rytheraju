const { db, initTables } = require('../_db');
const { cors } = require('../_auth');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    await initTables();
    const users   = await db.users.all();
    const farmers = users.filter(u => u.role==='farmer');
    const buyers  = users.filter(u => u.role==='buyer');
    const recent  = users.slice(0,5).map(({password,...u})=>u);
    res.json({ total_users:users.length, total_farmers:farmers.length, total_buyers:buyers.length, recent_signups:recent });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
};
