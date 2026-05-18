require('dotenv').config();
const emailValidator = require('email-validator');

const REQUIRED_ENV = ['EMAIL_USER', 'EMAIL_PASS'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  console.error('Copy .env.example to .env and fill in the values.');
  process.exit(1);
}

const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: true
  }
});

transporter.verify((error) => {
  if (error) {
    console.error('SMTP connection failed:', error.message);
  } else {
    console.log('SMTP ready — contact form operational');
  }
});

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  'https://globalmedsource.com.au',
  'https://www.globalmedsource.com.au',
];
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:3000');
}
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.static(__dirname));

function escapeHtml(str) {
  if (!str) return '—';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many enquiries submitted. Please try again in 15 minutes.' },
});

app.post('/api/contact', contactLimiter, async (req, res) => {
  const honeypot = req.body.honeypot;
  if (honeypot && honeypot.trim() !== '') {
    return res.status(200).json({ message: 'Thank you for your enquiry.' });
  }

  const { firstName, lastName, company, email, country, role, intent, message } = req.body;

  if (!firstName || !lastName || !email || !message) {
    return res.status(400).json({ success: false, error: 'Please fill in all required fields.' });
  }

  if (!emailValidator.validate(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const fieldLimits = [
    ['firstName', 200], ['lastName', 200], ['company', 200],
    ['email', 254], ['country', 100], ['role', 100],
    ['intent', 100], ['message', 5000],
  ];
  for (const [field, max] of fieldLimits) {
    if (req.body[field] && String(req.body[field]).length > max) {
      return res.status(400).json({ success: false, error: 'Input exceeds maximum length. Please shorten your entry and try again.' });
    }
  }

  const validRoles = [
    '', 'Pharmaceutical Company', 'Hospital / Clinic', 'Distributor / Wholesaler',
    'Research Institution', 'Clinical Trial Sponsor', 'Pharmaceutical Manufacturer',
    'Consultant / Regulatory Advisor', 'Other',
  ];
  const validIntents = [
    '', 'Source Australian pharmaceutical products', 'Partner as a supplier or wholesaler',
    'Explore a clinical trial supply arrangement', 'Submit a custom or special product request',
    'Discuss a regulatory or consulting opportunity', 'General enquiry',
  ];
  if (role != null && !validRoles.includes(role)) {
    return res.status(400).json({ success: false, error: 'Invalid enquiry type submitted.' });
  }
  if (intent != null && !validIntents.includes(intent)) {
    return res.status(400).json({ success: false, error: 'Invalid enquiry type submitted.' });
  }

  const mailOptions = {
    from: `"Global MedSource Enquiries" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_TO || 'enquiries@globalmedsource.com.au',
    replyTo: email,
    subject: `New Enquiry from ${escapeHtml(firstName)} ${escapeHtml(lastName)} — Global MedSource`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#1B4B4B;padding:28px 32px;text-align:center;">
            <p style="margin:0;color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:0.5px;">Global MedSource</p>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.5);font-size:12px;letter-spacing:1px;text-transform:uppercase;">New Contact Enquiry</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #E0EDED;">
                  <span style="color:#1B4B4B;font-weight:bold;font-size:13px;display:inline-block;width:160px;">Name</span>
                  <span style="color:#374151;font-size:14px;">${escapeHtml(firstName)} ${escapeHtml(lastName)}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #E0EDED;">
                  <span style="color:#1B4B4B;font-weight:bold;font-size:13px;display:inline-block;width:160px;">Company</span>
                  <span style="color:#374151;font-size:14px;">${escapeHtml(company)}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #E0EDED;">
                  <span style="color:#1B4B4B;font-weight:bold;font-size:13px;display:inline-block;width:160px;">Email</span>
                  <span style="font-size:14px;"><a href="mailto:${escapeHtml(email)}" style="color:#C9A84C;text-decoration:none;">${escapeHtml(email)}</a></span>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #E0EDED;">
                  <span style="color:#1B4B4B;font-weight:bold;font-size:13px;display:inline-block;width:160px;">Country</span>
                  <span style="color:#374151;font-size:14px;">${escapeHtml(country)}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #E0EDED;">
                  <span style="color:#1B4B4B;font-weight:bold;font-size:13px;display:inline-block;width:160px;">Role</span>
                  <span style="color:#374151;font-size:14px;">${escapeHtml(role)}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #E0EDED;">
                  <span style="color:#1B4B4B;font-weight:bold;font-size:13px;display:inline-block;width:160px;">Looking To Do</span>
                  <span style="color:#374151;font-size:14px;">${escapeHtml(intent)}</span>
                </td>
              </tr>
            </table>

            <div style="margin-top:24px;">
              <p style="margin:0 0 10px;color:#1B4B4B;font-weight:bold;font-size:13px;">Message</p>
              <div style="background:#f8f9fc;border:1px solid #E0EDED;border-radius:4px;padding:16px;color:#374151;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(message)}</div>
            </div>

            <div style="margin-top:24px;padding-top:20px;border-top:1px solid #E0EDED;">
              <a href="mailto:${escapeHtml(email)}" style="display:inline-block;background:#1B4B4B;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:4px;font-size:13px;font-weight:bold;">Reply to ${escapeHtml(firstName)}</a>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8f9fc;padding:16px 32px;text-align:center;border-top:1px solid #E0EDED;">
            <p style="margin:0;color:#9ca3af;font-size:11px;">Sent via the Global MedSource contact form · Sydney, Australia</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true });
  } catch (err) {
    console.error('Nodemailer error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to send your enquiry. Please try again or email us directly.' });
  }
});

module.exports = app;

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}
