// api/_auth.js — JWT auth helper for Vercel serverless
const jwt = require('jsonwebtoken');
const { db } = require('./_db');

async function verifyToken(req) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await db.users.findById(decoded.id);
    if (!user || !user.is_active) return null;
    const { password, ...safeUser } = user;
    return safeUser;
  } catch(e) {
    return null;
  }
}

function requireAuth(handler) {
  return async (req, res) => {
    const user = await verifyToken(req);
    if (!user) return res.status(401).json({ error: 'No token provided. Please log in.' });
    req.user = user;
    return handler(req, res);
  };
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

module.exports = { verifyToken, requireAuth, cors };
