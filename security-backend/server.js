require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { run, get, all, init } = require('./db');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret_in_production';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({ windowMs: 1 * 60 * 1000, max: 120 });
app.use(limiter);

async function ensureDb() {
  await init();
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Missing Authorization header' });
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Invalid Authorization header' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Register
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  const hash = await bcrypt.hash(password, 10);
  try {
    const r = await run(`INSERT INTO users (username, password_hash) VALUES (?, ?)`, [username, hash]);
    const userId = r.lastID;
    const token = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Username may already exist' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  const user = await get(`SELECT * FROM users WHERE username = ?`, [username]);
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

// Record login event and update monthly plan login_count
app.post('/api/record-login', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { device, location, status } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress || '';
  const ua = req.headers['user-agent'] || '';
  try {
    await run(`INSERT INTO login_records (user_id, device, location, ip_address, status, user_agent) VALUES (?, ?, ?, ?, ?, ?)`, [userId, device || null, location || null, ip, status || 'success', ua]);
    // increment monthly_plans.login_count for current month
    const month = new Date().toISOString().slice(0,7); // YYYY-MM
    const existing = await get(`SELECT * FROM monthly_plans WHERE user_id = ? AND month = ?`, [userId, month]);
    if (existing) {
      await run(`UPDATE monthly_plans SET login_count = login_count + 1, updated_at = datetime('now') WHERE id = ?`, [existing.id]);
    } else {
      await run(`INSERT INTO monthly_plans (user_id, month, goals, tasks, progress, notes, login_count) VALUES (?, ?, ?, ?, ?, ?, ?)`, [userId, month, '', '[]', 0, '', 1]);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not record login' });
  }
});

// Get recent login records
app.get('/api/login-records', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const rows = await all(`SELECT id, timestamp, device, location, ip_address, status, user_agent FROM login_records WHERE user_id = ? ORDER BY timestamp DESC LIMIT 200`, [userId]);
  res.json(rows);
});

// Get stats
app.get('/api/stats', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const weekAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString();
  const total = await get(`SELECT COUNT(*) as count FROM login_records WHERE user_id = ?`, [userId]);
  const last7 = await get(`SELECT COUNT(*) as count FROM login_records WHERE user_id = ? AND timestamp >= ?`, [userId, weekAgo]);
  const byDevice = await all(`SELECT device, COUNT(*) as count FROM login_records WHERE user_id = ? GROUP BY device`, [userId]);
  const failed = await get(`SELECT COUNT(*) as count FROM login_records WHERE user_id = ? AND status != 'success'`, [userId]);
  const uniqueDevices = await get(`SELECT COUNT(DISTINCT device) as count FROM login_records WHERE user_id = ?`, [userId]);
  res.json({ total: total.count || 0, last7: last7.count || 0, byDevice, failed: failed.count || 0, uniqueDevices: uniqueDevices.count || 0 });
});

// Monthly plans routes
app.get('/api/monthly-plans', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const rows = await all(`SELECT * FROM monthly_plans WHERE user_id = ? ORDER BY month DESC LIMIT 24`, [userId]);
  res.json(rows);
});

app.post('/api/monthly-plans', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { month, goals, tasks, progress, notes } = req.body;
  if (!month) return res.status(400).json({ error: 'month required (YYYY-MM)' });
  const existing = await get(`SELECT * FROM monthly_plans WHERE user_id = ? AND month = ?`, [userId, month]);
  if (existing) {
    await run(`UPDATE monthly_plans SET goals = ?, tasks = ?, progress = ?, notes = ?, updated_at = datetime('now') WHERE id = ?`, [goals || '', JSON.stringify(tasks || []), progress || 0, notes || '', existing.id]);
    res.json({ ok: true });
  } else {
    await run(`INSERT INTO monthly_plans (user_id, month, goals, tasks, progress, notes) VALUES (?, ?, ?, ?, ?, ?)`, [userId, month, goals || '', JSON.stringify(tasks || []), progress || 0, notes || '']);
    res.json({ ok: true });
  }
});

// simple health
app.get('/api/ping', (req, res) => res.json({ ok: true }));

(async function () {
  await ensureDb();
  if (process.argv.includes('--init-db')) {
    console.log('DB initialized');
    process.exit(0);
  }
  app.listen(PORT, () => console.log(`Security backend running on http://localhost:${PORT}`));
})();
