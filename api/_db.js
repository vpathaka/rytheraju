// api/_db.js — Shared PostgreSQL connection for Vercel serverless functions
const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 1, // Important for serverless — keep connections low
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

async function query(sql, params = []) {
  const client = getPool();
  return client.query(sql, params);
}

// Init tables
async function initTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id          SERIAL PRIMARY KEY,
      first_name  TEXT NOT NULL,
      last_name   TEXT NOT NULL,
      email       TEXT NOT NULL UNIQUE,
      mobile      TEXT NOT NULL,
      role        TEXT NOT NULL,
      password    TEXT NOT NULL,
      district    TEXT,
      land_acres  NUMERIC,
      company     TEXT,
      is_verified INTEGER DEFAULT 0,
      is_active   INTEGER DEFAULT 1,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS listings (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      crop_name   TEXT NOT NULL,
      quantity    NUMERIC NOT NULL,
      price       NUMERIC NOT NULL,
      grade       TEXT DEFAULT 'A',
      location    TEXT NOT NULL,
      district    TEXT,
      description TEXT,
      photos      TEXT,
      status      TEXT DEFAULT 'active',
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS bids (
      id          SERIAL PRIMARY KEY,
      listing_id  INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      buyer_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      bid_price   NUMERIC NOT NULL,
      quantity    NUMERIC,
      message     TEXT,
      status      TEXT DEFAULT 'pending',
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS password_resets (
      id         SERIAL PRIMARY KEY,
      email      TEXT NOT NULL,
      token      TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used       INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS photos TEXT;
  `);
}

// DB helper methods
const db = {
  users: {
    async findByEmail(email) {
      const r = await query('SELECT * FROM users WHERE LOWER(email)=LOWER($1)', [email]);
      return r.rows[0];
    },
    async findById(id) {
      const r = await query('SELECT * FROM users WHERE id=$1', [id]);
      return r.rows[0];
    },
    async create(data) {
      const r = await query(
        `INSERT INTO users(first_name,last_name,email,mobile,role,password,district,land_acres,company)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [data.first_name, data.last_name, data.email.toLowerCase(), data.mobile,
         data.role, data.password, data.district||null, data.land_acres||null, data.company||null]
      );
      return r.rows[0];
    },
    async update(id, updates) {
      const fields = Object.keys(updates);
      if (!fields.length) return db.users.findById(id);
      const set  = fields.map((f,i) => `${f}=$${i+2}`).join(',');
      const vals = fields.map(f => updates[f]);
      const r = await query(`UPDATE users SET ${set},updated_at=NOW() WHERE id=$1 RETURNING *`, [id,...vals]);
      return r.rows[0];
    },
    async all() {
      const r = await query('SELECT * FROM users ORDER BY created_at DESC');
      return r.rows;
    },
  },
  listings: {
    async findById(id) {
      const r = await query('SELECT * FROM listings WHERE id=$1', [id]);
      return r.rows[0];
    },
    async allActive(filters={}) {
      let sql = `SELECT l.*,u.first_name||' '||u.last_name AS farmer_name,u.mobile AS farmer_mobile
                 FROM listings l JOIN users u ON l.user_id=u.id WHERE l.status='active'`;
      const params=[];
      if(filters.district){params.push(filters.district);sql+=` AND l.district=$${params.length}`;}
      if(filters.crop){params.push(`%${filters.crop}%`);sql+=` AND l.crop_name ILIKE $${params.length}`;}
      sql+=' ORDER BY l.created_at DESC';
      const r = await query(sql,params);
      return r.rows;
    },
    async byUser(userId) {
      const r = await query('SELECT * FROM listings WHERE user_id=$1 ORDER BY created_at DESC',[userId]);
      return r.rows;
    },
    async create(data) {
      const r = await query(
        `INSERT INTO listings(user_id,crop_name,quantity,price,grade,location,district,description,photos)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [data.user_id,data.crop_name,data.quantity,data.price,data.grade||'A',
         data.location,data.district||null,data.description||null,data.photos||null]
      );
      return r.rows[0];
    },
    async update(id,updates) {
      const allowed=['crop_name','quantity','price','grade','location','district','description','status','photos'];
      const fields=Object.keys(updates).filter(k=>allowed.includes(k));
      if(!fields.length) return db.listings.findById(id);
      const set=fields.map((f,i)=>`${f}=$${i+2}`).join(',');
      const vals=fields.map(f=>updates[f]);
      const r=await query(`UPDATE listings SET ${set},updated_at=NOW() WHERE id=$1 RETURNING *`,[id,...vals]);
      return r.rows[0];
    },
    async delete(id){ await query('DELETE FROM listings WHERE id=$1',[id]); },
  },
  bids: {
    async findById(id){ const r=await query('SELECT * FROM bids WHERE id=$1',[id]); return r.rows[0]; },
    async byListing(listingId){
      const r=await query(`SELECT b.*,u.first_name||' '||u.last_name AS buyer_name,u.mobile AS buyer_mobile,u.company
        FROM bids b JOIN users u ON b.buyer_id=u.id WHERE b.listing_id=$1 ORDER BY b.created_at DESC`,[listingId]);
      return r.rows;
    },
    async byBuyer(buyerId){
      const r=await query(`SELECT b.*,l.crop_name,l.location,l.price AS listing_price,u.first_name||' '||u.last_name AS farmer_name
        FROM bids b JOIN listings l ON b.listing_id=l.id JOIN users u ON l.user_id=u.id
        WHERE b.buyer_id=$1 ORDER BY b.created_at DESC`,[buyerId]);
      return r.rows;
    },
    async create(data){
      const r=await query(`INSERT INTO bids(listing_id,buyer_id,bid_price,quantity,message) VALUES($1,$2,$3,$4,$5) RETURNING *`,
        [data.listing_id,data.buyer_id,data.bid_price,data.quantity||null,data.message||null]);
      return r.rows[0];
    },
    async update(id,updates){
      const r=await query('UPDATE bids SET status=$2 WHERE id=$1 RETURNING *',[id,updates.status]);
      return r.rows[0];
    },
  },
  resets: {
    async create(email,token,expiresAt){
      await query('DELETE FROM password_resets WHERE email=LOWER($1)',[email]);
      const r=await query('INSERT INTO password_resets(email,token,expires_at) VALUES(LOWER($1),$2,$3) RETURNING *',[email,token,expiresAt]);
      return r.rows[0];
    },
    async findByToken(token){
      const r=await query("SELECT * FROM password_resets WHERE token=$1 AND used=0 AND expires_at>NOW()",[token]);
      return r.rows[0];
    },
    async markUsed(token){ await query('UPDATE password_resets SET used=1 WHERE token=$1',[token]); },
  },
};

module.exports = { db, query, initTables };
