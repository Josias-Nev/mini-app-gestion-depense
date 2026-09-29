const express = require('express');
const { z } = require('zod');
const db = require('../db');
const { validate } = require('../middleware/validate');

const router = express.Router();

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Le nom est requis.').max(50),
  type: z.enum(['income', 'expense'], { message: 'Type invalide.' }),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Couleur invalide (format #RRGGBB attendu).')
    .default('#10b981'),
  icon: z.string().trim().min(1).max(8).default('📦'),
});

function getOwnCategory(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: { message: 'Identifiant invalide.' } });
    return null;
  }
  const cat = db
    .prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?')
    .get(id, req.userId);
  if (!cat) {
    res.status(404).json({ error: { message: 'Catégorie introuvable.' } });
    return null;
  }
  return cat;
}

// GET /api/categories — avec compteur de transactions
router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT c.id, c.name, c.type, c.color, c.icon, c.is_default AS isDefault,
              COUNT(t.id) AS transactionCount
       FROM categories c
       LEFT JOIN transactions t ON t.category_id = c.id AND t.user_id = c.user_id
       WHERE c.user_id = ?
       GROUP BY c.id
       ORDER BY c.type DESC, c.name ASC`
    )
    .all(req.userId);
  res.json({ categories: rows });
});

// POST /api/categories
router.post('/', validate(categorySchema), (req, res) => {
  const { name, type, color, icon } = req.body;
  const existing = db
    .prepare('SELECT id FROM categories WHERE user_id = ? AND name = ? AND type = ?')
    .get(req.userId, name, type);
  if (existing) {
    return res.status(409).json({ error: { message: 'Cette catégorie existe déjà.' } });
  }
  const info = db
    .prepare('INSERT INTO categories (user_id, name, type, color, icon) VALUES (?, ?, ?, ?, ?)')
    .run(req.userId, name, type, color, icon);
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ category: cat });
});

// PATCH /api/categories/:id
router.patch('/:id', validate(categorySchema), (req, res) => {
  const cat = getOwnCategory(req, res);
  if (!cat) return;
  const { name, type, color, icon } = req.body;
  const clash = db
    .prepare('SELECT id FROM categories WHERE user_id = ? AND name = ? AND type = ? AND id != ?')
    .get(req.userId, name, type, cat.id);
  if (clash) {
    return res.status(409).json({ error: { message: 'Une catégorie porte déjà ce nom.' } });
  }
  // Si le type change, on vérifie qu'aucune transaction n'utilise l'ancien type
  if (type !== cat.type) {
    const used = db
      .prepare('SELECT COUNT(*) AS n FROM transactions WHERE category_id = ?')
      .get(cat.id).n;
    if (used > 0) {
      return res.status(400).json({
        error: { message: 'Impossible de changer le type : des transactions utilisent cette catégorie.' },
      });
    }
  }
  db.prepare('UPDATE categories SET name = ?, type = ?, color = ?, icon = ? WHERE id = ?').run(
    name, type, color, icon, cat.id
  );
  res.json({ category: db.prepare('SELECT * FROM categories WHERE id = ?').get(cat.id) });
});

// DELETE /api/categories/:id
router.delete('/:id', (req, res) => {
  const cat = getOwnCategory(req, res);
  if (!cat) return;
  const txCount = db
    .prepare('SELECT COUNT(*) AS n FROM transactions WHERE category_id = ?')
    .get(cat.id).n;
  const budgetCount = db
    .prepare('SELECT COUNT(*) AS n FROM budgets WHERE category_id = ?')
    .get(cat.id).n;
  if (txCount > 0 || budgetCount > 0) {
    return res.status(400).json({
      error: {
        message: `Suppression impossible : cette catégorie est utilisée par ${txCount} transaction(s) et ${budgetCount} budget(s).`,
      },
    });
  }
  db.prepare('DELETE FROM categories WHERE id = ?').run(cat.id);
  res.json({ ok: true });
});

module.exports = router;
