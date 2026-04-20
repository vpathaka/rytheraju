const { db, initTables } = require('../_db');
const { requireAuth, cors } = require('../_auth');

module.exports = requireAuth(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  await initTables();
  if (req.method === 'GET') {
    const user = await db.users.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password, ...safe } = user;
    return res.json({ user: safe });
  }
  if (req.method === 'PUT') {
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
    return res.json({ message: 'Profile updated!', user: safe });
  }
  res.status(405).json({ error: 'Method not allowed' });
});
