/** 404 pour les routes API inconnues. */
function notFound(req, res) {
  res.status(404).json({ error: { message: 'Ressource introuvable.' } });
}

/** Gestionnaire d'erreurs central : réponse JSON cohérente. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('[api] erreur:', err);
  if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({ error: { message: 'Cet élément existe déjà.' } });
  }
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'Corps de requête JSON invalide.' } });
  }
  const status = err.status || 500;
  res.status(status).json({
    error: { message: err.expose ? err.message : 'Erreur interne du serveur.' },
  });
}

module.exports = { notFound, errorHandler };
