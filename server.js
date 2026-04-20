const express = require('express');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

require('dotenv').config();
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL = { name: 'Birthday Tracker', email: process.env.FROM_EMAIL };
const PORT = process.env.PORT || 3000;

async function sendEmail(toEmail, subject, htmlContent) {
  await axios.post(
    'https://api.sendinblue.com/v3/smtp/email',
    { sender: FROM_EMAIL, to: [{ email: toEmail }], subject, htmlContent },
    { headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' } }
  );
}

function getInitials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[parts.length - 1][0] + parts[0][0]).toUpperCase();
}

// Circle with initials — works in all email clients
function initialsCircle(name, bgColor, borderColor, textColor) {
  const initials = getInitials(name);
  return `
  <table cellpadding="0" cellspacing="0" border="0" align="center" width="120" style="margin:0 auto;">
    <tr>
      <td width="120" height="120" align="center" valign="middle" bgcolor="${bgColor}"
        style="width:120px;height:120px;border-radius:60px;border:4px solid ${borderColor};
               font-size:42px;font-weight:bold;color:${textColor};
               font-family:Arial,Helvetica,sans-serif;text-align:center;vertical-align:middle;">
        ${initials}
      </td>
    </tr>
  </table>`;
}

function birthdayPersonTemplate(name) {
  const circle = initialsCircle(name, '#ffffff', '#ff6b6b', '#ff6b6b');
  return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Happy Birthday</title>
</head>
<body style="margin:0;padding:0;background-color:#fff0e6;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#fff0e6">
<tr><td align="center" style="padding:30px 10px;">

  <!-- Card -->
  <table width="680" cellpadding="0" cellspacing="0" border="0"
    style="max-width:680px;width:100%;background-color:#ffffff;border:1px solid #ffd0a0;">

    <!-- Confetti -->
    <tr>
      <td align="center" bgcolor="#fffbe6"
        style="padding:14px 20px;font-size:22px;letter-spacing:4px;border-bottom:3px solid #ffcc80;">
        🎊 &nbsp;🎉 &nbsp;🎈 &nbsp;🎁 &nbsp;🎀 &nbsp;🥳 &nbsp;🎈 &nbsp;🎉 &nbsp;🎊
      </td>
    </tr>

    <!-- Red header -->
    <tr>
      <td align="center" bgcolor="#ff6b6b" style="padding:60px 32px 50px;">
        ${circle}
        <div style="height:14px;"></div>
        <table cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center">
          <span style="color:#ffffff;font-size:30px;font-weight:bold;font-family:Arial,sans-serif;">🎉 Happy Birthday!</span>
        </td></tr></table>
        <div style="height:8px;"></div>
        <table cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center">
          <span style="color:#fff3e0;font-size:20px;font-weight:bold;font-family:Arial,sans-serif;">${name}</span>
        </td></tr></table>
      </td>
    </tr>

    <!-- Divider -->
    <tr>
      <td align="center" bgcolor="#ff8e53"
        style="padding:10px 20px;font-size:20px;letter-spacing:6px;color:#ffffff;font-family:Arial,sans-serif;">
        🎈 &nbsp;🎁 &nbsp;🎀 &nbsp;🎂 &nbsp;🎁 &nbsp;🎈
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td align="center" bgcolor="#ffffff" style="padding:50px 64px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td align="center">
          <p style="font-size:20px;color:#2d3436;margin:0 0 18px;font-weight:bold;font-family:Arial,sans-serif;">
            🎂 Many Happy Returns of the Day!
          </p>
          <p style="font-size:15px;color:#636e72;line-height:1.7;margin:0 0 20px;font-family:Arial,sans-serif;text-align:center;">
            On your special day, the entire <strong>Intellect team</strong> comes together to celebrate you! 🥳<br/>
            May this year bring you endless joy, great success, and all the happiness you truly deserve.<br/>
            You are an amazing part of our team &mdash; keep shining and inspiring everyone around you! 🌟
          </p>
          <p style="font-size:32px;margin:0 0 20px;letter-spacing:8px;font-family:Arial,sans-serif;">🎈 &nbsp;🎁 &nbsp;🎀 &nbsp;🎈</p>
          <p style="font-size:14px;color:#b2bec3;margin:0;font-family:Arial,sans-serif;">With love from the Intellect Family ❤️</p>
        </td></tr></table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td align="center" bgcolor="#f8f9fa" style="padding:14px;border-top:1px solid #eeeeee;">
        <p style="margin:0;font-size:12px;color:#aaaaaa;font-family:Arial,sans-serif;">
          Intellect Birthday Tracker &bull; Automated birthday wish
        </p>
      </td>
    </tr>

  </table>
</td></tr>
</table>

</body>
</html>`;
}

function notificationTemplate(birthdayPersonName) {
  const circle = initialsCircle(birthdayPersonName, '#ede7ff', '#6c5ce7', '#6c5ce7');
  return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Birthday Alert</title>
</head>
<body style="margin:0;padding:0;background-color:#ede7ff;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ede7ff">
<tr><td align="center" style="padding:30px 10px;">

  <!-- Card -->
  <table width="680" cellpadding="0" cellspacing="0" border="0"
    style="max-width:680px;width:100%;background-color:#ffffff;border:1px solid #c9b8ff;">

    <!-- Confetti -->
    <tr>
      <td align="center" bgcolor="#f3f0ff"
        style="padding:14px 20px;font-size:22px;letter-spacing:4px;border-bottom:3px solid #c9b8ff;">
        🎊 &nbsp;🎉 &nbsp;🎈 &nbsp;🎁 &nbsp;🎀 &nbsp;🥳 &nbsp;🎈 &nbsp;🎉 &nbsp;🎊
      </td>
    </tr>

    <!-- Purple header -->
    <tr>
      <td align="center" bgcolor="#6c5ce7" style="padding:60px 32px 50px;">
        ${circle}
        <div style="height:14px;"></div>
        <table cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center">
          <span style="color:#ffffff;font-size:28px;font-weight:bold;font-family:Arial,sans-serif;">🎂 Birthday Alert!</span>
        </td></tr></table>
        <div style="height:8px;"></div>
        <table cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center">
          <span style="color:#d4c8ff;font-size:15px;font-family:Arial,sans-serif;">Someone special is celebrating today 🥳</span>
        </td></tr></table>
      </td>
    </tr>

    <!-- Divider -->
    <tr>
      <td align="center" bgcolor="#8b7cf8"
        style="padding:10px 20px;font-size:20px;letter-spacing:6px;color:#ffffff;font-family:Arial,sans-serif;">
        🎈 &nbsp;🎁 &nbsp;🎀 &nbsp;🎂 &nbsp;🎁 &nbsp;🎈
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td align="center" bgcolor="#ffffff" style="padding:50px 64px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td align="center">
          <p style="font-size:19px;color:#2d3436;margin:0 0 14px;font-weight:bold;font-family:Arial,sans-serif;">
            🎉 Today is <span style="color:#6c5ce7;">${birthdayPersonName}</span>'s Birthday!
          </p>
          <p style="font-size:15px;color:#636e72;line-height:1.7;margin:0 0 20px;font-family:Arial,sans-serif;text-align:center;">
            Let's make their day extra special! 🌟<br/>
            Take a moment to walk up to <strong>${birthdayPersonName}</strong> and give them your warmest wishes.<br/>
            A simple wish from you can make their entire day unforgettable. 😊
          </p>
          <table cellpadding="0" cellspacing="0" border="0" align="center">
            <tr>
              <td align="center" bgcolor="#f3f0ff"
                style="padding:16px 36px;border:2px solid #6c5ce7;">
                <span style="font-size:15px;color:#6c5ce7;font-weight:bold;font-family:Arial,sans-serif;">
                  💬 Go ahead and wish them today!
                </span>
              </td>
            </tr>
          </table>
          <p style="font-size:14px;color:#b2bec3;margin:28px 0 0;font-family:Arial,sans-serif;">With love from the Intellect Family ❤️</p>
        </td></tr></table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td align="center" bgcolor="#f8f9fa" style="padding:14px;border-top:1px solid #eeeeee;">
        <p style="margin:0;font-size:12px;color:#aaaaaa;font-family:Arial,sans-serif;">
          Intellect Birthday Tracker &bull; Automated birthday notification
        </p>
      </td>
    </tr>

  </table>
</td></tr>
</table>

</body>
</html>`;
}

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'src')));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const DATA_DIR = path.join(__dirname, 'src/assets/data');

// ensure data files exist
['events.json','contributions.json','expenses.json','employees.json'].forEach(f => {
  const fp = path.join(DATA_DIR, f);
  if (!fs.existsSync(fp)) fs.writeFileSync(fp, '[]', 'utf8');
});
function readJSON(file) { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8')); }
function writeJSON(file, data) { fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2), 'utf8'); }

// ── Health check ────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'Birthday Tracker API running' }));

// ── Events ──────────────────────────────────────────
app.get('/api/events', (req, res) => res.json(readJSON('events.json')));
app.put('/api/events/:id', (req, res) => {
  const events = readJSON('events.json');
  const idx = events.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  events[idx] = { ...events[idx], ...req.body };
  writeJSON('events.json', events);
  res.json({ success: true });
});
app.post('/api/events', (req, res) => {
  const events = readJSON('events.json');
  events.push(req.body);
  writeJSON('events.json', events);
  res.json({ success: true });
});
app.delete('/api/events/:id', (req, res) => {
  writeJSON('events.json', readJSON('events.json').filter(e => e.id !== req.params.id));
  writeJSON('contributions.json', readJSON('contributions.json').filter(c => c.eventId !== req.params.id));
  writeJSON('expenses.json', readJSON('expenses.json').filter(x => x.eventId !== req.params.id));
  res.json({ success: true });
});

// ── Contributions ────────────────────────────────────
app.get('/api/contributions', (req, res) => res.json(readJSON('contributions.json')));
app.post('/api/contributions', (req, res) => {
  const all = readJSON('contributions.json');
  all.push(req.body);
  writeJSON('contributions.json', all);
  res.json({ success: true });
});
app.put('/api/contributions/:id', (req, res) => {
  const all = readJSON('contributions.json');
  const idx = all.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  all[idx] = { ...all[idx], ...req.body };
  writeJSON('contributions.json', all);
  res.json({ success: true });
});
app.delete('/api/contributions/:id', (req, res) => {
  writeJSON('contributions.json', readJSON('contributions.json').filter(c => c.id !== req.params.id));
  res.json({ success: true });
});

// ── Expenses ─────────────────────────────────────────
app.get('/api/expenses', (req, res) => res.json(readJSON('expenses.json')));
app.post('/api/expenses', (req, res) => {
  const all = readJSON('expenses.json');
  all.push(req.body);
  writeJSON('expenses.json', all);
  res.json({ success: true });
});
app.delete('/api/expenses/:id', (req, res) => {
  writeJSON('expenses.json', readJSON('expenses.json').filter(x => x.id !== req.params.id));
  res.json({ success: true });
});

// ── Birthday Emails ───────────────────────────────────
app.post('/api/send-birthday-emails', async (req, res) => {
  await sendBirthdayEmails();
  res.json({ success: true });
});

function getLocalDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

async function sendBirthdayEmails(targetDate) {
  try {
    const date = targetDate || getLocalDate();
    const events = readJSON('events.json');
    const employees = readJSON('employees.json');

    const birthdayPeople = events.filter(e => e.celebrationDate === date);
    if (birthdayPeople.length === 0) { console.log(`[${date}] No birthdays today.`); return; }

    for (const person of birthdayPeople) {
      const emp = employees.find(e => e.employeeId === person.employeeId);

      if (emp) {
        await sendEmail(
          emp.email,
          `Happy Birthday ${person.employeeName} - Many Happy Returns of the Day!`,
          birthdayPersonTemplate(person.employeeName)
        );
      }

      const others = employees.filter(e => e.employeeId !== person.employeeId);
      for (const other of others) {
        await sendEmail(
          other.email,
          `Today is ${person.employeeName}'s Birthday - Wish them now!`,
          notificationTemplate(person.employeeName)
        );
      }
    }
    console.log(`[${date}] Birthday emails sent for: ${birthdayPeople.map(p => p.employeeName).join(', ')}`);
  } catch (err) {
    console.error('Birthday email error:', err.response?.data || err.message);
  }
}

// TEMP TEST — runs at 10:10 AM for today's birthdays
cron.schedule('14 10 * * *', () => {
  const todayDate = getLocalDate();
  console.log(`[CRON] Checking birthdays for today: ${todayDate}`);
  sendBirthdayEmails(todayDate);
});

app.listen(PORT, () => {
  console.log(`🎂 Birthday Tracker API running on http://localhost:${PORT}`);
});
