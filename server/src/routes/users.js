const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const db = require('../db');
const { validate } = require('../middleware/validate');

const router = express.Router();

const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'XOF', 'GBP', 'CHF', 'CAD', 'MAD'];

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Le nom doit contenir au moins 2 caractères.').max(80),
  email: z.string().trim().toLowerCase().email('Adresse email invalide.').max(120),
  currency: z.enum(SUPPORTED_CURRENCIES, { message: 'Devise non prise en charge.' }),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Le mot de passe actuel est requis.'),
  newPassword: z
    .string()
    .min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères.')
    .max(100),
});

// PATCH /api/users/me
router.patch('/me', validate(profileSchema), (req, res) => {
  const { name, email, currency } = req.body;
  const conflict = db
    .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
    .get(email, req.userId);
  if (conflict) {
    return res.status(409).json({ error: { message: 'Cet email est déjà utilisé par un autre compte.' } });
  }
  db.prepare('UPDATE users SET name = ?, email = ?, currency = ? WHERE id = ?').run(
    name,
    email,
    currency,
    req.userId
  );
  const user = db.prepare('SELECT id, name, email, currency, created_at AS createdAt FROM users WHERE id = ?').get(req.userId);
  res.json({ user });
});

// PATCH /api/users/me/password
router.patch('/me/password', validate(passwordSchema), (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(400).json({ error: { message: 'Le mot de passe actuel est incorrect.' } });
  }
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
    bcrypt.hashSync(newPassword, 10),
    req.userId
  );
  res.json({ ok: true });
});

module.exports = router;
