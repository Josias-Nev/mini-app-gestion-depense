const express = require('express');
const { z } = require('zod');
const db = require('../db');
const { validate } = require('../middleware/validate');
const { checkCategory } = require('../categoryCheck');
const { processRecurringRules } = require('../recurring');

const router = express.Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'];

const dateField = z
  .string()
  .regex(DATE_RE, 'Date invalide (format AAAA-MM-JJ attendu).');

const createSchema = z.object({
  type: z.enum(['income', 'expense'], { message: 'Type invalide.' }),
  amount: z
    .number({ message: 'Le montant doit être un nombre.' })
    .positive('Le montant doit être supérieur à 0.')
    .max(100000000, 'Montant trop élevé.'),
  categoryId: z.number({ message: 'La catégorie est requise.' }).int().positive(),
  frequency: z.enum(FREQUENCIES, { message: 'Fréquence invalide.' }),
  start_date: dateField,
  description: z.string().trim().max(200, 'Description trop longue (200 caractères max).').default(''),
});

const patchSchema = z
  .object({
    amount: z.number().positive('Le montant doit être supérieur à 0.').max(100000000),
    categoryId: z.number().int().positive(),
    frequency: z.enum(FREQUENCIES),
    next_run_date: dateField,
    description: z.string().trim().max(200),
    active: z.boolean(),
  })
  .partial();

const SELECT_RULE = `
  SELECT r.id, r.type, r.amount, r.description, r.frequency,
         r.start_date AS startDate, r.next_run_date AS nextRunDate,
         r.active, r.category_id AS categoryId,
         c.name AS categoryName, c.color AS categoryColor, c.icon AS categoryIcon
  FROM recurring_rules r
  LEFT JOIN categories c ON c.id = r.category_id
`;

function getOwnRule(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: { message: 'Identifiant invalide.' } });
    return null;
  }
  const rule = db
    .prepare('SELECT * FROM recurring_rules WHERE id = ? AND user_id = ?')
    .get(id, req.userId);
  if (!rule) {
    res.status(404).json({ error: { message: 'Règle récurrente introuvable.' } });
    return null;
  }
  return rule;
}

// GET /api/recurring
router.get('/', (req, res) => {
  const rules = db
    .prepare(`${SELECT_RULE} WHERE r.user_id = ? ORDER BY r.next_run_date ASC, r.id ASC`)
    .all(req.userId);
  res.json({ rules });
});

// POST /api/recurring — crée la règle puis génère immédiatement les échéances dues
router.post('/', validate(createSchema), (req, res) => {
  const { type, amount, categoryId, frequency, start_date, description } = req.body;
  if (!checkCategory(req, res, categoryId, type)) return;
  const info = db
    .prepare(
      `INSERT INTO recurring_rules (user_id, category_id, type, amount, description, frequency, start_date, next_run_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(req.userId, categoryId, type, Math.round(amount * 100), description, frequency, start_date, start_date);
  // Génère tout de suite les échéances déjà passées (ex. date de début = aujourd'hui)
  processRecurringRules(db, { userId: req.userId });
  const rule = db.prepare(`${SELECT_RULE} WHERE r.id = ?`).get(info.lastInsertRowid);
  res.status(201).json({ rule });
});

// PATCH /api/recurring/:id — modification partielle (montant, fréquence, pause…)
router.patch('/:id', validate(patchSchema), (req, res) => {
  const rule = getOwnRule(req, res);
  if (!rule) return;
  const updates = [];
  const params = [];
  const fields = {
    amount: (v) => Math.round(v * 100),
    categoryId: (v) => v,
    frequency: (v) => v,
    next_run_date: (v) => v,
    description: (v) => v,
    active: (v) => (v ? 1 : 0),
  };
  for (const [key, map] of Object.entries(fields)) {
    if (req.body[key] !== undefined) {
      updates.push(`${key} = ?`);
      params.push(map(req.body[key]));
    }
  }
  if (req.body.categoryId !== undefined && !checkCategory(req, res, req.body.categoryId, rule.type)) {
    return;
  }
  if (updates.length > 0) {
    db.prepare(
      `UPDATE recurring_rules SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`
    ).run(...params, rule.id);
  }
  // Si la règle vient d'être réactivée ou repoussée, génère les échéances dues
  processRecurringRules(db, { userId: req.userId });
  res.json({ rule: db.prepare(`${SELECT_RULE} WHERE r.id = ?`).get(rule.id) });
});

// DELETE /api/recurring/:id — supprime la règle sans toucher aux transactions générées
router.delete('/:id', (req, res) => {
  const rule = getOwnRule(req, res);
  if (!rule) return;
  db.prepare('DELETE FROM recurring_rules WHERE id = ?').run(rule.id);
  res.json({ ok: true });
});

module.exports = router;
