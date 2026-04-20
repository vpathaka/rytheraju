const jwt     = require('jsonwebtoken');
const { db }  = require('./db');

module.exports = async function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ error: 'No token provided. Please log in.' });

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await db.users.findById(decoded.id);
    if (!user || !user.is_active)
      return res.status(401).json({ error: 'User not found or deactivated.' });
    const { password, ...safeUser } = user;
    req.user = safeUser;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }
};
