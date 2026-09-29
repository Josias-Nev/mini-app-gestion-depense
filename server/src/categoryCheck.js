const db = require('./db');

/**
 * Vérifie que la catégorie appartient à l'utilisateur et correspond au type.
 * En cas d'échec, envoie directement la réponse d'erreur et retourne false.
 */
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

module.exports = { checkCategory };
