const express = require('express');
const { z } = require('zod');
const db = require('../db');
const { validate } = require('../middleware/validate');

const router = express.Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const transactionSchema = z.object({
  type: z.enum(['income', 'expense'], { message: 'Type invalide.' }),
  // Montant en euros (nombre positif), converti en centimes côté serveur
  amount: z
    .number({ message: 'Le montant doit être un nombre.' })
    .positive('Le montant doit être supérieur à 0.')
    .max(100000000, 'Montant trop élevé.'),
  categoryId: z.number({ message: 'La catégorie est requise.' }).int().positive(),
  date: z
    .string()
    .regex(DATE_RE, 'Date invalide (format AAAA-MM-JJ attendu).')
    .refine((d) => !Number.isNaN(new Date(d + 'T00:00:00').getTime()), 'Date invalide.'),
  description: z.string().trim().max(200, 'Description trop longue (200 caractères max).').default(''),
});

function toCents(amount) {
  return Math.round(amount * 100);
}

/** Vérifie que la catégorie appartient à l'utilisateur et correspond au type. */
function checkCategory(req, res, categoryId, type) {
  const cat = db
    .prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?')
    .get(categoryId, req.userId);
  if (!cat) {
    res.status(404).json({ error: { message: 'Catégorie introuvable.' } });
    return false;
  }
  if (cat.type !== type) {
    res.status(400).json({
      error: {
        message:
          type === 'expense'
            ? 'Cette catégorie est une catégorie de revenu, pas de dépense.'
            : 'Cette catégorie est une catégorie de dépense, pas de revenu.',
      },
    });
    return false;
  }
  return true;
}

function getOwnTransaction(req, res, userId) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: { message: 'Identifiant invalide.' } });
    return null;
  }
  const tx = db
    .prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?')
    .get(id, userId);
  if (!tx) {
    res.status(404).json({ error: { message: 'Transaction introuvable.' } });
    return null;
  }
  return tx;
}

const SELECT_TX = `
  SELECT t.id, t.type, t.amount, t.description, t.date, t.created_at AS createdAt,
         t.updated_at AS updatedAt, t.category_id AS categoryId,
         c.name AS categoryName, c.color AS categoryColor, c.icon AS categoryIcon
  FROM transactions t
  LEFT JOIN categories c ON c.id = t.category_id
`;

// GET /api/transactions — recherche, filtres, tri, pagination
router.get('/', (req, res) => {
  const {
    q, type, categoryId, from, to, min, max,
    page = '1', limit = '10', sort = 'date_desc',
  } = req.query;

  const where = ['t.user_id = ?'];
  const params = [req.userId];

  if (type === 'income' || type === 'expense') {
    where.push('t.type = ?');
    params.push(type);
  }
  if (categoryId && Number.isInteger(Number(categoryId))) {
    where.push('t.category_id = ?');
    params.push(Number(categoryId));
  }
  if (from && DATE_RE.test(from)) {
    where.push('t.date >= ?');
    params.push(from);
  }
  if (to && DATE_RE.test(to)) {
    where.push('t.date <= ?');
    params.push(to);
  }
  if (min !== undefined && min !== '' && !Number.isNaN(Number(min))) {
    where.push('t.amount >= ?');
    params.push(toCents(Math.abs(Number(min))));
  }
  if (max !== undefined && max !== '' && !Number.isNaN(Number(max))) {
    where.push('t.amount <= ?');
    params.push(toCents(Math.abs(Number(max))));
  }
  if (q && String(q).trim()) {
    where.push('(t.description LIKE ? OR c.name LIKE ?)');
    const like = `%${String(q).trim()}%`;
    params.push(like, like);
  }

  const sorts = {
    date_desc: 't.date DESC, t.id DESC',
    date_asc: 't.date ASC, t.id ASC',
    amount_desc: 't.amount DESC',
    amount_asc: 't.amount ASC',
  };
  const orderBy = sorts[sort] || sorts.date_desc;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  const whereSQL = `WHERE ${where.join(' AND ')}`;

  const total = db
    .prepare(`SELECT COUNT(*) AS n FROM transactions t LEFT JOIN categories c ON c.id = t.category_id ${whereSQL}`)
    .get(...params).n;

  const totals = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount END), 0) AS income,
         COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount END), 0) AS expense
       FROM transactions t LEFT JOIN categories c ON c.id = t.category_id ${whereSQL}`
    )
    .get(...params);

  const transactions = db
    .prepare(`${SELECT_TX} ${whereSQL} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
    .all(...params, limitNum, offset);

  res.json({
    transactions,
    totals,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
    },
  });
});

// GET /api/transactions/:id
router.get('/:id', (req, res) => {
  const tx = getOwnTransaction(req, res, req.userId);
  if (!tx) return;
  const full = db
    .prepare(`${SELECT_TX} WHERE t.id = ?`)
    .get(tx.id);
  res.json({ transaction: full });
});

// POST /api/transactions
router.post('/', validate(transactionSchema), (req, res) => {
  const { type, amount, categoryId, date, description } = req.body;
  if (!checkCategory(req, res, categoryId, type)) return;
  const info = db
    .prepare(
      `INSERT INTO transactions (user_id, category_id, type, amount, description, date)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(req.userId, categoryId, type, toCents(amount), description, date);
  const created = db.prepare(`${SELECT_TX} WHERE t.id = ?`).get(info.lastInsertRowid);
  res.status(201).json({ transaction: created });
});

// PATCH /api/transactions/:id
router.patch('/:id', validate(transactionSchema), (req, res) => {
  const tx = getOwnTransaction(req, res, req.userId);
  if (!tx) return;
  const { type, amount, categoryId, date, description } = req.body;
  if (!checkCategory(req, res, categoryId, type)) return;
  db.prepare(
    `UPDATE transactions
     SET category_id = ?, type = ?, amount = ?, description = ?, date = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(categoryId, type, toCents(amount), description, date, tx.id);
  const updated = db.prepare(`${SELECT_TX} WHERE t.id = ?`).get(tx.id);
  res.json({ transaction: updated });
});

// DELETE /api/transactions/:id
router.delete('/:id', (req, res) => {
  const tx = getOwnTransaction(req, res, req.userId);
  if (!tx) return;
  db.prepare('DELETE FROM transactions WHERE id = ?').run(tx.id);
  res.json({ ok: true });
});

module.exports = router;
