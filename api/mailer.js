// mailer.js — Email via Brevo HTTP API (sends to any email, no domain needed)
const axios = require('axios');

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

async function sendEmail({ to, subject, html }) {
  if (!process.env.BREVO_API_KEY) {
    console.log('⚠️  BREVO_API_KEY not set — skipping email to:', to);
    return;
  }
  try {
    console.log(`📧 Sending email to: ${to}`);
    const response = await axios.post(BREVO_URL, {
      sender:  { name: 'Rytheraju', email: 'aazaad4u@gmail.com' },
      to:      [{ email: to }],
      subject,
      htmlContent: html,
    }, {
      headers: {
        'api-key':     process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept':       'application/json',
      },
    });
    console.log('✅ Email sent to:', to, '| ID:', response.data.messageId);
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    console.error('❌ Email error:', msg);
  }
}

// ── Templates ─────────────────────────────────────────────────────────────────
const header = `
  <div style="background:linear-gradient(135deg,#0f4c2a,#1a6b3c);padding:32px 40px;border-radius:16px 16px 0 0;text-align:center;">
    <h1 style="color:#ffffff;font-size:28px;margin:0;">🌿 Rytheraju</h1>
    <p style="color:#86efac;font-size:13px;margin:6px 0 0;letter-spacing:1px;">రైతేరాజు • Farmer to Buyer Marketplace</p>
  </div>`;

const footer = `
  <div style="background:#f9fafb;padding:20px 40px;border-radius:0 0 16px 16px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="color:#9ca3af;font-size:12px;margin:0;">© 2026 Rytheraju • Andhra Pradesh</p>
    <p style="color:#9ca3af;font-size:12px;margin:4px 0 0;"><a href="https://rytheraju.vercel.app" style="color:#1a6b3c;">Visit Website</a></p>
  </div>`;

// ── 1. Farmer Welcome ─────────────────────────────────────────────────────────
async function sendFarmerWelcome(user) {
  await sendEmail({
    to: user.email,
    subject: '🌾 Welcome to Rytheraju! Your farmer account is ready',
    html: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;">
      ${header}
      <div style="padding:32px 40px;background:#fff;">
        <h2 style="color:#0f4c2a;margin:0 0 16px;">Welcome, ${user.first_name}! 👋</h2>
        <p style="color:#374151;font-size:15px;line-height:1.7;">Your <strong>Farmer account</strong> on Rytheraju is now active. List your crops and connect directly with verified buyers across Andhra Pradesh.</p>
        <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:24px 0;border:1px solid #86efac;">
          <p style="color:#0f4c2a;font-weight:700;margin:0 0 10px;">Your Account</p>
          <p style="color:#374151;font-size:14px;margin:4px 0;">📧 ${user.email}</p>
          <p style="color:#374151;font-size:14px;margin:4px 0;">📍 ${user.district || '—'}</p>
          <p style="color:#374151;font-size:14px;margin:4px 0;">🌾 Farmer</p>
        </div>
        <ul style="color:#374151;font-size:14px;line-height:2;">
          <li>➕ Post your crop listings</li>
          <li>🏷️ Receive bids from verified buyers</li>
          <li>💬 Contact buyers via WhatsApp</li>
          <li>📊 Check daily market prices</li>
        </ul>
        <div style="text-align:center;margin-top:28px;">
          <a href="https://rytheraju.vercel.app" style="background:#1a6b3c;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">Go to Dashboard →</a>
        </div>
      </div>
      ${footer}
    </div>`
  });
}

// ── 2. Buyer Welcome ──────────────────────────────────────────────────────────
async function sendBuyerWelcome(user) {
  await sendEmail({
    to: user.email,
    subject: '🏢 Welcome to Rytheraju! Start buying fresh crops',
    html: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;">
      ${header}
      <div style="padding:32px 40px;background:#fff;">
        <h2 style="color:#0f4c2a;margin:0 0 16px;">Welcome, ${user.first_name}! 👋</h2>
        <p style="color:#374151;font-size:15px;line-height:1.7;">Your <strong>Buyer account</strong> on Rytheraju is now active. Browse fresh crop listings directly from farmers — no middlemen, fair prices.</p>
        <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:24px 0;border:1px solid #86efac;">
          <p style="color:#0f4c2a;font-weight:700;margin:0 0 10px;">Your Account</p>
          <p style="color:#374151;font-size:14px;margin:4px 0;">📧 ${user.email}</p>
          ${user.company ? `<p style="color:#374151;font-size:14px;margin:4px 0;">🏢 ${user.company}</p>` : ''}
          <p style="color:#374151;font-size:14px;margin:4px 0;">🛒 Buyer</p>
        </div>
        <ul style="color:#374151;font-size:14px;line-height:2;">
          <li>🛒 Browse fresh crop listings</li>
          <li>🏷️ Place bids on crops</li>
          <li>💬 Contact farmers via WhatsApp</li>
          <li>📊 Track daily market prices</li>
        </ul>
        <div style="text-align:center;margin-top:28px;">
          <a href="https://rytheraju.vercel.app" style="background:#1a6b3c;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">Browse Crops →</a>
        </div>
      </div>
      ${footer}
    </div>`
  });
}

// ── 3. Bid Notification → Farmer ─────────────────────────────────────────────
async function sendBidNotificationToFarmer({ farmer, buyer, listing, bid }) {
  const waLink = `https://wa.me/${(buyer.mobile||'').replace(/[^0-9]/g,'')}?text=${encodeURIComponent(`Hi ${buyer.first_name}, I received your bid of ₹${bid.bid_price}/qtl for ${listing.crop_name} on Rytheraju. Let us discuss further.`)}`;
  await sendEmail({
    to: farmer.email,
    subject: `🏷️ New bid on your ${listing.crop_name} listing!`,
    html: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;">
      ${header}
      <div style="padding:32px 40px;background:#fff;">
        <h2 style="color:#0f4c2a;margin:0 0 16px;">New bid received! 🎉</h2>
        <p style="color:#374151;font-size:15px;line-height:1.7;"><strong>${buyer.first_name} ${buyer.last_name}</strong> placed a bid on your <strong>${listing.crop_name}</strong> listing.</p>
        <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:24px 0;border:1px solid #86efac;">
          <p style="color:#0f4c2a;font-weight:700;margin:0 0 12px;">Bid Details</p>
          <table style="width:100%;font-size:14px;color:#374151;">
            <tr><td style="padding:5px 0;color:#6b7280;">Crop</td><td style="font-weight:700;">${listing.crop_name}</td></tr>
            <tr><td style="padding:5px 0;color:#6b7280;">Your Price</td><td>₹${Number(listing.price).toLocaleString()}/qtl</td></tr>
            <tr><td style="padding:5px 0;color:#6b7280;">Bid Price</td><td style="font-weight:700;color:#1a6b3c;font-size:16px;">₹${Number(bid.bid_price).toLocaleString()}/qtl</td></tr>
            ${bid.quantity ? `<tr><td style="padding:5px 0;color:#6b7280;">Quantity</td><td>${bid.quantity} qtl</td></tr>` : ''}
            ${bid.message ? `<tr><td style="padding:5px 0;color:#6b7280;">Message</td><td style="font-style:italic;">"${bid.message}"</td></tr>` : ''}
          </table>
        </div>
        <div style="background:#f9fafb;border-radius:12px;padding:16px;margin-bottom:24px;">
          <p style="color:#374151;font-size:14px;margin:0 0 8px;"><strong>Buyer Contact</strong></p>
          <p style="color:#374151;font-size:14px;margin:4px 0;">👤 ${buyer.first_name} ${buyer.last_name}</p>
          <p style="color:#374151;font-size:14px;margin:4px 0;">📱 ${buyer.mobile || '—'}</p>
          ${buyer.company ? `<p style="color:#374151;font-size:14px;margin:4px 0;">🏢 ${buyer.company}</p>` : ''}
        </div>
        <div style="text-align:center;">
          <a href="${waLink}" style="display:inline-block;background:#25d366;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;margin-right:12px;">💬 WhatsApp Buyer</a>
          <a href="https://rytheraju.vercel.app" style="display:inline-block;background:#1a6b3c;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">View Dashboard →</a>
        </div>
      </div>
      ${footer}
    </div>`
  });
}

// ── 4. Bid Confirmation → Buyer ───────────────────────────────────────────────
async function sendBidConfirmationToBuyer({ buyer, farmer, listing, bid }) {
  await sendEmail({
    to: buyer.email,
    subject: `✅ Your bid on ${listing.crop_name} was placed!`,
    html: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;">
      ${header}
      <div style="padding:32px 40px;background:#fff;">
        <h2 style="color:#0f4c2a;margin:0 0 16px;">Bid placed! ✅</h2>
        <p style="color:#374151;font-size:15px;line-height:1.7;">Your bid on <strong>${listing.crop_name}</strong> from <strong>${farmer.first_name} ${farmer.last_name}</strong> has been sent. The farmer will review and contact you soon.</p>
        <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:24px 0;border:1px solid #86efac;">
          <p style="color:#0f4c2a;font-weight:700;margin:0 0 12px;">Your Bid Summary</p>
          <table style="width:100%;font-size:14px;color:#374151;">
            <tr><td style="padding:5px 0;color:#6b7280;">Crop</td><td style="font-weight:700;">${listing.crop_name}</td></tr>
            <tr><td style="padding:5px 0;color:#6b7280;">Location</td><td>📍 ${listing.location}</td></tr>
            <tr><td style="padding:5px 0;color:#6b7280;">Asking Price</td><td>₹${Number(listing.price).toLocaleString()}/qtl</td></tr>
            <tr><td style="padding:5px 0;color:#6b7280;">Your Bid</td><td style="font-weight:700;color:#1a6b3c;font-size:16px;">₹${Number(bid.bid_price).toLocaleString()}/qtl</td></tr>
            ${bid.quantity ? `<tr><td style="padding:5px 0;color:#6b7280;">Quantity</td><td>${bid.quantity} qtl</td></tr>` : ''}
            <tr><td style="padding:5px 0;color:#6b7280;">Status</td><td><span style="background:#fef9c3;color:#92400e;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:700;">Pending</span></td></tr>
          </table>
        </div>
        <div style="text-align:center;margin-top:24px;">
          <a href="https://rytheraju.vercel.app" style="background:#1a6b3c;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">Track Your Bids →</a>
        </div>
      </div>
      ${footer}
    </div>`
  });
}

// ── 5. Password Reset Email ───────────────────────────────────────────────────
async function sendPasswordReset(user, resetLink) {
  await sendEmail({
    to: user.email,
    subject: '🔒 Reset your Rytheraju password',
    html: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;">
      ${header}
      <div style="padding:32px 40px;background:#fff;">
        <h2 style="color:#0f4c2a;margin:0 0 16px;">Reset your password 🔒</h2>
        <p style="color:#374151;font-size:15px;line-height:1.7;">Hi <strong>${user.first_name}</strong>, we received a request to reset your Rytheraju password.</p>
        <p style="color:#374151;font-size:15px;line-height:1.7;">Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${resetLink}" style="background:#1a6b3c;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">Reset Password →</a>
        </div>
        <div style="background:#fef9c3;border-radius:10px;padding:14px 18px;margin-top:24px;border:1px solid #fcd34d;">
          <p style="color:#92400e;font-size:13px;margin:0;">⚠️ If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
        </div>
        <p style="color:#9ca3af;font-size:12px;margin-top:20px;">Or copy this link: <br/><a href="${resetLink}" style="color:#1a6b3c;word-break:break-all;">${resetLink}</a></p>
      </div>
      ${footer}
    </div>`
  });
}

module.exports = { sendFarmerWelcome, sendBuyerWelcome, sendBidNotificationToFarmer, sendBidConfirmationToBuyer, sendPasswordReset };
