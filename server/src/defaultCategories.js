// Catégories créées automatiquement pour chaque nouvel utilisateur.
const DEFAULT_CATEGORIES = [
  // Dépenses
  { name: 'Alimentation', type: 'expense', icon: '🛒', color: '#f59e0b' },
  { name: 'Restaurants', type: 'expense', icon: '🍽️', color: '#ef4444' },
  { name: 'Logement', type: 'expense', icon: '🏠', color: '#8b5cf6' },
  { name: 'Transport', type: 'expense', icon: '🚗', color: '#3b82f6' },
  { name: 'Santé', type: 'expense', icon: '💊', color: '#ec4899' },
  { name: 'Loisirs', type: 'expense', icon: '🎮', color: '#14b8a6' },
  { name: 'Shopping', type: 'expense', icon: '🛍️', color: '#f97316' },
  { name: 'Abonnements', type: 'expense', icon: '📱', color: '#6366f1' },
  { name: 'Éducation', type: 'expense', icon: '📚', color: '#0ea5e9' },
  { name: 'Factures', type: 'expense', icon: '🧾', color: '#64748b' },
  { name: 'Autres dépenses', type: 'expense', icon: '📦', color: '#94a3b8' },
  // Revenus
  { name: 'Salaire', type: 'income', icon: '💼', color: '#10b981' },
  { name: 'Freelance', type: 'income', icon: '💻', color: '#22c55e' },
  { name: 'Remboursement', type: 'income', icon: '↩️', color: '#84cc16' },
  { name: 'Cadeau', type: 'income', icon: '🎁', color: '#d946ef' },
  { name: 'Autres revenus', type: 'income', icon: '💰', color: '#4ade80' },
];

function seedDefaultCategories(db, userId) {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO categories (user_id, name, type, color, icon, is_default)
     VALUES (?, ?, ?, ?, ?, 1)`
  );
  const run = db.transaction(() => {
    for (const c of DEFAULT_CATEGORIES) {
      insert.run(userId, c.name, c.type, c.color, c.icon);
    }
  });
  run();
}

module.exports = { DEFAULT_CATEGORIES, seedDefaultCategories };
