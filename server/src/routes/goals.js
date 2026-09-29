const express = require('express');
const { z } = require('zod');
const db = require('../db');
const { validate } = require('../middleware/validate');

const router = express.Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Cohérence comptable : un versement vers un objectif crée une transaction
 * de dépense (sortie du solde disponible), un retrait crée un revenu.
 * Les catégories dédiées sont créées à la volée si besoin.
 */
function ensureSavingsCategory(database, userId, type) {
  const def =
    type === 'expense'
      ? { name: 'Épargne', icon: '🐷', color: '#10b981' }
      : { name: 'Retrait épargne', icon: '🏦', color: '#22c55e' };
  const existing = database
    .prepare('SELECT * FROM categories WHERE user_id = ? AND name = ? AND type = ?')
    .get(userId, def.name, type);
  if (existing) return existing;
  const info = database
    .prepare('INSERT INTO categories (user_id, name, type, color, icon) VALUES (?, ?, ?, ?, ?)')
    .run(userId, def.name, type, def.color, def.icon);
  return database.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid);
}

const goalSchema = z.object({
  name: z.string().trim().min(1, 'Le nom est requis.').max(60),
  target: z
    .number({ message: 'Le montant cible doit être un nombre.' })
    .positive('La cible doit être supérieure à 0.')
    .max(100000000, 'Montant trop élevé.'),
  deadline: z
    .string()
    .regex(DATE_RE, 'Date invalide (format AAAA-MM-JJ attendu).')
    .nullable()
    .optional(),
  icon: z.string().trim().min(1).max(8).default('🎯'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Couleur invalide (format #RRGGBB attendu).')
    .default('#3b82f6'),
});

const goalPatchSchema = goalSchema.partial();

const movementSchema = z.object({
  amount: z
    .number({ message: 'Le montant doit être un nombre.' })
    .positive('Le montant doit être supérieur à 0.')
    .max(100000000, 'Montant trop élevé.'),
  action: z.enum(['deposit', 'withdraw'], { message: 'Action invalide (deposit ou withdraw).' }),
});

function getOwnGoal(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: { message: 'Identifiant invalide.' } });
    return null;
  }
  const goal = db
    .prepare('SELECT * FROM savings_goals WHERE id = ? AND user_id = ?')
    .get(id, req.userId);
  if (!goal) {
    res.status(404).json({ error: { message: 'Objectif introuvable.' } });
    return null;
  }
  return goal;
}

// GET /api/goals
router.get('/', (req, res) => {
  const goals = db
    .prepare('SELECT * FROM savings_goals WHERE user_id = ? ORDER BY created_at ASC')
    .all(req.userId);
  res.json({ goals });
});

// POST /api/goals
router.post('/', validate(goalSchema), (req, res) => {
  const { name, target, deadline, icon, color } = req.body;
  const info = db
    .prepare(
      'INSERT INTO savings_goals (user_id, name, icon, color, target_amount, deadline) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(req.userId, name, icon, color, Math.round(target * 100), deadline ?? null);
  res.status(201).json({
    goal: db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(info.lastInsertRowid),
  });
});

// PATCH /api/goals/:id
router.patch('/:id', validate(goalPatchSchema), (req, res) => {
  const goal = getOwnGoal(req, res);
  if (!goal) return;
  const map = {
    name: (v) => ['name', v],
    target: (v) => ['target_amount', Math.round(v * 100)],
    deadline: (v) => ['deadline', v ?? null],
    icon: (v) => ['icon', v],
    color: (v) => ['color', v],
  };
  const sets = [];
  const params = [];
  for (const [key, fn] of Object.entries(map)) {
    if (req.body[key] !== undefined) {
      const [col, val] = fn(req.body[key]);
      sets.push(`${col} = ?`);
      params.push(val);
    }
  }
  if (sets.length > 0) {
    db.prepare(
      `UPDATE savings_goals SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`
    ).run(...params, goal.id);
  }
  res.json({ goal: db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(goal.id) });
});

// DELETE /api/goals/:id — l'historique des transactions liées est conservé
router.delete('/:id', (req, res) => {
  const goal = getOwnGoal(req, res);
  if (!goal) return;
  db.prepare('DELETE FROM savings_goals WHERE id = ?').run(goal.id);
  res.json({ ok: true });
});

// POST /api/goals/:id/movements — versement (dépense) ou retrait (revenu)
router.post('/:id/movements', validate(movementSchema), (req, res) => {
  const goal = getOwnGoal(req, res);
  if (!goal) return;
  const { amount, action } = req.body;
  const cents = Math.round(amount * 100);

  if (action === 'withdraw' && goal.current_amount < cents) {
    return res.status(400).json({
      error: {
        message: `Retrait impossible : seulement ${(goal.current_amount / 100).toFixed(2)} disponibles sur cet objectif.`,
      },
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const label =
    action === 'deposit' ? `Versement épargne — ${goal.name}` : `Retrait épargne — ${goal.name}`;

  let result;
  const run = db.transaction(() => {
    const cat = ensureSavingsCategory(db, req.userId, action === 'deposit' ? 'expense' : 'income');
    const txInfo = db
      .prepare(
        `INSERT INTO transactions (user_id, category_id, type, amount, description, date)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(req.userId, cat.id, action === 'deposit' ? 'expense' : 'income', cents, label, today);
    db.prepare(
      `UPDATE savings_goals
       SET current_amount = current_amount ${action === 'deposit' ? '+' : '-'} ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(cents, goal.id);
    result = {
      goal: db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(goal.id),
      transaction: db.prepare('SELECT * FROM transactions WHERE id = ?').get(txInfo.lastInsertRowid),
    };
  });
  run();

  res.status(201).json(result);
});

module.exports = router;
module.exports.ensureSavingsCategory = ensureSavingsCategory;
