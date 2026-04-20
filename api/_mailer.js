// api/_mailer.js — Brevo email for Vercel serverless
const axios = require('axios');

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

async function sendEmail({ to, subject, html }) {
  if (!process.env.BREVO_API_KEY) { console.log('⚠️ BREVO_API_KEY not set'); return; }
  try {
    const res = await axios.post(BREVO_URL, {
      sender:      { name: 'Rytheraju', email: 'aazaad4u@gmail.com' },
      to:          [{ email: to }],
      subject,
      htmlContent: html,
    }, {
      headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' }
    });
    console.log('✅ Email sent to:', to);
  } catch(err) {
    console.error('❌ Email error:', err.response?.data?.message || err.message);
  }
}

const header = `<div style="background:linear-gradient(135deg,#0f4c2a,#1a6b3c);padding:32px 40px;border-radius:16px 16px 0 0;text-align:center;">
  <h1 style="color:#fff;font-size:28px;margin:0;">🌿 Rytheraju</h1>
  <p style="color:#86efac;font-size:13px;margin:6px 0 0;">రైతేరాజు • Farmer to Buyer Marketplace</p></div>`;

const footer = `<div style="background:#f9fafb;padding:20px 40px;border-radius:0 0 16px 16px;text-align:center;border-top:1px solid #e5e7eb;">
  <p style="color:#9ca3af;font-size:12px;margin:0;">© 2026 Rytheraju • Andhra Pradesh</p>
  <p style="color:#9ca3af;font-size:12px;margin:4px 0 0;"><a href="https://rytheraju.vercel.app" style="color:#1a6b3c;">Visit Website</a></p></div>`;

async function sendFarmerWelcome(user) {
  await sendEmail({ to: user.email, subject: '🌾 Welcome to Rytheraju! Your farmer account is ready',
    html: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;">${header}
      <div style="padding:32px 40px;background:#fff;">
        <h2 style="color:#0f4c2a;">Welcome, ${user.first_name}! 👋</h2>
        <p style="color:#374151;font-size:15px;line-height:1.7;">Your <strong>Farmer account</strong> is now active. List your crops and connect with buyers across Andhra Pradesh.</p>
        <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:20px 0;border:1px solid #86efac;">
          <p style="color:#374151;font-size:14px;margin:4px 0;">📧 ${user.email}</p>
          <p style="color:#374151;font-size:14px;margin:4px 0;">📍 ${user.district||'—'}</p>
          <p style="color:#374151;font-size:14px;margin:4px 0;">🌾 Farmer</p>
        </div>
        <div style="text-align:center;margin-top:24px;">
          <a href="https://rytheraju.vercel.app" style="background:#1a6b3c;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;">Go to Dashboard →</a>
        </div>
      </div>${footer}</div>`
  });
}

async function sendBuyerWelcome(user) {
  await sendEmail({ to: user.email, subject: '🏢 Welcome to Rytheraju! Start buying fresh crops',
    html: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;">${header}
      <div style="padding:32px 40px;background:#fff;">
        <h2 style="color:#0f4c2a;">Welcome, ${user.first_name}! 👋</h2>
        <p style="color:#374151;font-size:15px;line-height:1.7;">Your <strong>Buyer account</strong> is now active. Browse fresh crop listings from farmers — no middlemen, fair prices.</p>
        <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:20px 0;border:1px solid #86efac;">
          <p style="color:#374151;font-size:14px;margin:4px 0;">📧 ${user.email}</p>
          ${user.company?`<p style="color:#374151;font-size:14px;margin:4px 0;">🏢 ${user.company}</p>`:''}
          <p style="color:#374151;font-size:14px;margin:4px 0;">🛒 Buyer</p>
        </div>
        <div style="text-align:center;margin-top:24px;">
          <a href="https://rytheraju.vercel.app" style="background:#1a6b3c;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;">Browse Crops →</a>
        </div>
      </div>${footer}</div>`
  });
}

async function sendBidNotificationToFarmer({ farmer, buyer, listing, bid }) {
  const waLink = `https://wa.me/${(buyer.mobile||'').replace(/[^0-9]/g,'')}?text=${encodeURIComponent(`Hi ${buyer.first_name}, I received your bid of ₹${bid.bid_price}/qtl for ${listing.crop_name} on Rytheraju.`)}`;
  await sendEmail({ to: farmer.email, subject: `🏷️ New bid on your ${listing.crop_name} listing!`,
    html: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;">${header}
      <div style="padding:32px 40px;background:#fff;">
        <h2 style="color:#0f4c2a;">New bid received! 🎉</h2>
        <p style="color:#374151;font-size:15px;"><strong>${buyer.first_name} ${buyer.last_name}</strong> bid on your <strong>${listing.crop_name}</strong>.</p>
        <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:20px 0;border:1px solid #86efac;">
          <p style="color:#374151;font-size:14px;">Crop: <strong>${listing.crop_name}</strong></p>
          <p style="color:#374151;font-size:14px;">Your Price: ₹${Number(listing.price).toLocaleString()}/qtl</p>
          <p style="color:#1a6b3c;font-size:18px;font-weight:700;">Bid: ₹${Number(bid.bid_price).toLocaleString()}/qtl</p>
          ${bid.message?`<p style="color:#374151;font-size:14px;font-style:italic;">"${bid.message}"</p>`:''}
          <p style="color:#374151;font-size:14px;">Buyer: ${buyer.first_name} ${buyer.last_name} • 📱 ${buyer.mobile||'—'}</p>
        </div>
        <div style="text-align:center;">
          <a href="${waLink}" style="display:inline-block;background:#25d366;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;margin-right:12px;">💬 WhatsApp Buyer</a>
          <a href="https://rytheraju.vercel.app" style="display:inline-block;background:#1a6b3c;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;">View Dashboard →</a>
        </div>
      </div>${footer}</div>`
  });
}

async function sendBidConfirmationToBuyer({ buyer, farmer, listing, bid }) {
  await sendEmail({ to: buyer.email, subject: `✅ Your bid on ${listing.crop_name} was placed!`,
    html: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;">${header}
      <div style="padding:32px 40px;background:#fff;">
        <h2 style="color:#0f4c2a;">Bid placed! ✅</h2>
        <p style="color:#374151;font-size:15px;">Your bid on <strong>${listing.crop_name}</strong> from <strong>${farmer.first_name} ${farmer.last_name}</strong> has been sent.</p>
        <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:20px 0;border:1px solid #86efac;">
          <p style="color:#374151;font-size:14px;">Crop: <strong>${listing.crop_name}</strong></p>
          <p style="color:#374151;font-size:14px;">Location: 📍 ${listing.location}</p>
          <p style="color:#374151;font-size:14px;">Asking: ₹${Number(listing.price).toLocaleString()}/qtl</p>
          <p style="color:#1a6b3c;font-size:18px;font-weight:700;">Your Bid: ₹${Number(bid.bid_price).toLocaleString()}/qtl</p>
        </div>
        <div style="text-align:center;margin-top:24px;">
          <a href="https://rytheraju.vercel.app" style="background:#1a6b3c;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;">Track Your Bids →</a>
        </div>
      </div>${footer}</div>`
  });
}

async function sendPasswordReset(user, resetLink) {
  await sendEmail({ to: user.email, subject: '🔒 Reset your Rytheraju password',
    html: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;">${header}
      <div style="padding:32px 40px;background:#fff;">
        <h2 style="color:#0f4c2a;">Reset your password 🔒</h2>
        <p style="color:#374151;font-size:15px;line-height:1.7;">Hi <strong>${user.first_name}</strong>, click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${resetLink}" style="background:#1a6b3c;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;">Reset Password →</a>
        </div>
        <div style="background:#fef9c3;border-radius:10px;padding:14px 18px;border:1px solid #fcd34d;">
          <p style="color:#92400e;font-size:13px;margin:0;">⚠️ If you did not request this, please ignore this email.</p>
        </div>
      </div>${footer}</div>`
  });
}

module.exports = { sendFarmerWelcome, sendBuyerWelcome, sendBidNotificationToFarmer, sendBidConfirmationToBuyer, sendPasswordReset };
