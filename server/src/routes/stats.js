const express = require('express');
const db = require('../db');

const router = express.Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

// GET /api/stats/overview — solde global + totaux du mois courant
router.get('/overview', (req, res) => {
  const month = currentMonth();
  const global = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0)  AS income,
         COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS expense,
         COUNT(*) AS count
       FROM transactions WHERE user_id = ?`
    )
    .get(req.userId);
  const monthly = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0)  AS income,
         COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS expense,
         COUNT(*) AS count
       FROM transactions WHERE user_id = ? AND date BETWEEN ? AND ?`
    )
    .get(req.userId, `${month}-01`, `${month}-31`);
  const totalBudget = db
    .prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM budgets WHERE user_id = ? AND month = ?')
    .get(req.userId, month).total;
  res.json({
    month,
    balance: global.income - global.expense,
    global,
    monthly,
    totalBudget,
  });
});

// GET /api/stats/by-category?from=&to=&type=expense
router.get('/by-category', (req, res) => {
  const type = req.query.type === 'income' ? 'income' : 'expense';
  const where = ["t.user_id = ?", "t.type = ?"];
  const params = [req.userId, type];
  if (req.query.from && DATE_RE.test(req.query.from)) {
    where.push('t.date >= ?');
    params.push(req.query.from);
  }
  if (req.query.to && DATE_RE.test(req.query.to)) {
    where.push('t.date <= ?');
    params.push(req.query.to);
  }
  const rows = db
    .prepare(
      `SELECT c.id, c.name, c.color, c.icon,
              SUM(t.amount) AS total, COUNT(t.id) AS count
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE ${where.join(' AND ')}
       GROUP BY c.id
       ORDER BY total DESC`
    )
    .all(...params);
  res.json({ type, categories: rows });
});

// GET /api/stats/monthly?months=6 — série revenus/dépenses par mois
router.get('/monthly', (req, res) => {
  let months = parseInt(req.query.months, 10);
  if (!Number.isInteger(months) || months < 1) months = 6;
  months = Math.min(months, 24);
  const rows = db
    .prepare(
      `SELECT substr(date, 1, 7) AS month,
              COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0)  AS income,
              COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS expense
       FROM transactions
       WHERE user_id = ?
       GROUP BY month
       ORDER BY month DESC
       LIMIT ?`
    )
    .all(req.userId, months);
  res.json({ months: rows.reverse() });
});

// ---- utilitaires de dates pour le découpage en sous-périodes ----

function toDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toISO(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, n) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

/** Lundi de la semaine contenant la date (semaines ISO, UTC). */
function mondayOf(date) {
  const d = new Date(date.getTime());
  const dow = (d.getUTCDay() + 6) % 7; // 0 = lundi
  d.setUTCDate(d.getUTCDate() - dow);
  return d;
}

/** Génère les bornes de début de chaque sous-période couvrant [from, to]. */
function bucketStarts(from, to, granularity) {
  const end = toDate(to);
  let current = toDate(from);
  if (granularity === 'week') current = mondayOf(current);
  if (granularity === 'month') current.setUTCDate(1);
  const starts = [];
  while (current <= end) {
    starts.push(toISO(current));
    if (granularity === 'day') current = addDays(current, 1);
    else if (granularity === 'week') current = addDays(current, 7);
    else current.setUTCMonth(current.getUTCMonth() + 1);
  }
  return starts;
}

function bucketKey(isoDate, granularity) {
  if (granularity === 'day') return isoDate;
  if (granularity === 'week') return toISO(mondayOf(toDate(isoDate)));
  return `${isoDate.slice(0, 7)}-01`;
}

// GET /api/stats/by-period?from=&to=&granularity=day|week|month
// Revenus/dépenses découpés en sous-périodes continues sur une plage libre.
router.get('/by-period', (req, res) => {
  const { from, to, granularity = 'month' } = req.query;
  if (!from || !to || !DATE_RE.test(from) || !DATE_RE.test(to)) {
    return res.status(400).json({
      error: { message: 'Paramètres "from" et "to" requis (format AAAA-MM-JJ).' },
    });
  }
  if (from > to) {
    return res.status(400).json({ error: { message: '"from" doit être antérieur à "to".' } });
  }
  if (!['day', 'week', 'month'].includes(granularity)) {
    return res.status(400).json({ error: { message: 'Granularité invalide (day, week ou month).' } });
  }

  const spanDays = Math.round((toDate(to) - toDate(from)) / 86400000) + 1;
  if (spanDays > 366) {
    return res.status(400).json({ error: { message: 'La plage ne peut pas dépasser 366 jours.' } });
  }
  if (granularity === 'day' && spanDays > 62) {
    return res.status(400).json({
      error: { message: 'Vue "jour" limitée à 62 jours : choisissez la vue semaine.' },
    });
  }

  const starts = bucketStarts(from, to, granularity);
  const buckets = new Map(starts.map((s) => [s, { period: s, income: 0, expense: 0 }]));

  const rows = db
    .prepare(
      `SELECT date, type, amount FROM transactions
       WHERE user_id = ? AND date BETWEEN ? AND ?`
    )
    .all(req.userId, from, to);
  for (const r of rows) {
    const b = buckets.get(bucketKey(r.date, granularity));
    if (b) b[r.type === 'income' ? 'income' : 'expense'] += r.amount;
  }

  res.json({ from, to, granularity, points: [...buckets.values()] });
});

// GET /api/stats/daily?month=YYYY-MM — dépenses cumulées jour par jour
router.get('/daily', (req, res) => {
  const month = req.query.month;
  if (!month || !MONTH_RE.test(month)) {
    return res.status(400).json({ error: { message: 'Paramètre "month" requis (format AAAA-MM).' } });
  }
  const rows = db
    .prepare(
      `SELECT date, SUM(amount) AS total
       FROM transactions
       WHERE user_id = ? AND type = 'expense' AND date BETWEEN ? AND ?
       GROUP BY date
       ORDER BY date ASC`
    )
    .all(req.userId, `${month}-01`, `${month}-31`);
  res.json({ month, days: rows });
});

module.exports = router;
