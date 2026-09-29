const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const db = require('../db');
const { seedDefaultCategories } = require('../defaultCategories');
const { validate } = require('../middleware/validate');
const {
  signToken,
  setAuthCookie,
  clearAuthCookie,
  requireAuth,
} = require('../middleware/auth');

const router = express.Router();

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Le nom doit contenir au moins 2 caractères.').max(80),
  email: z.string().trim().toLowerCase().email('Adresse email invalide.').max(120),
  password: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères.')
    .max(100),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Adresse email invalide.'),
  password: z.string().min(1, 'Le mot de passe est requis.'),
});

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, currency: u.currency, createdAt: u.created_at };
}

// POST /api/auth/register
router.post('/register', validate(registerSchema), (req, res) => {
  const { name, email, password } = req.body;
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: { message: 'Un compte existe déjà avec cet email.' } });
  }
  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(name, email, hash);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  seedDefaultCategories(db, user.id);
  const token = signToken(user);
  setAuthCookie(res, token);
  res.status(201).json({ user: publicUser(user), token });
});

// POST /api/auth/login
router.post('/login', validate(loginSchema), (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: { message: 'Email ou mot de passe incorrect.' } });
  }
  const token = signToken(user);
  setAuthCookie(res, token);
  res.json({ user: publicUser(user), token });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(401).json({ error: { message: 'Session invalide.' } });
  res.json({ user: publicUser(user) });
});

module.exports = router;
