const express = require('express');
const { z } = require('zod');
const db = require('../db');
const { validate } = require('../middleware/validate');

const router = express.Router();

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const budgetSchema = z.object({
  categoryId: z.number({ message: 'La catégorie est requise.' }).int().positive(),
  month: z.string().regex(MONTH_RE, 'Mois invalide (format AAAA-MM attendu).'),
  amount: z
    .number({ message: 'Le montant doit être un nombre.' })
    .positive('Le budget doit être supérieur à 0.')
    .max(100000000, 'Montant trop élevé.'),
});

// GET /api/budgets?month=YYYY-MM — budgets + montants dépensés
router.get('/', (req, res) => {
  const month = req.query.month;
  if (!month || !MONTH_RE.test(month)) {
    return res.status(400).json({ error: { message: 'Paramètre "month" requis (format AAAA-MM).' } });
  }
  const from = `${month}-01`;
  const to = `${month}-31`;
  const budgets = db
    .prepare(
      `SELECT b.id, b.month, b.amount, b.category_id AS categoryId,
              c.name AS categoryName, c.color AS categoryColor, c.icon AS categoryIcon,
              COALESCE((
                SELECT SUM(t.amount) FROM transactions t
                WHERE t.user_id = b.user_id AND t.category_id = b.category_id
                  AND t.type = 'expense' AND t.date BETWEEN ? AND ?
              ), 0) AS spent
       FROM budgets b
       JOIN categories c ON c.id = b.category_id
       WHERE b.user_id = ? AND b.month = ?
       ORDER BY c.name ASC`
    )
    .all(from, to, req.userId, month);
  res.json({ budgets });
});

// PUT /api/budgets — crée ou met à jour le budget d'une catégorie pour un mois
router.put('/', validate(budgetSchema), (req, res) => {
  const { categoryId, month, amount } = req.body;
  const cat = db
    .prepare("SELECT * FROM categories WHERE id = ? AND user_id = ? AND type = 'expense'")
    .get(categoryId, req.userId);
  if (!cat) {
    return res.status(404).json({
      error: { message: 'Catégorie de dépense introuvable.' },
    });
  }
  const cents = Math.round(amount * 100);
  db.prepare(
    `INSERT INTO budgets (user_id, category_id, month, amount)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, category_id, month)
     DO UPDATE SET amount = excluded.amount`
  ).run(req.userId, categoryId, month, cents);
  const budget = db
    .prepare('SELECT * FROM budgets WHERE user_id = ? AND category_id = ? AND month = ?')
    .get(req.userId, categoryId, month);
  res.status(201).json({ budget });
});

// DELETE /api/budgets/:id
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: { message: 'Identifiant invalide.' } });
  }
  const info = db
    .prepare('DELETE FROM budgets WHERE id = ? AND user_id = ?')
    .run(id, req.userId);
  if (info.changes === 0) {
    return res.status(404).json({ error: { message: 'Budget introuvable.' } });
  }
  res.json({ ok: true });
});

module.exports = router;
