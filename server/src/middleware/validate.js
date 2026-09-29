/** Valide req.body avec un schéma Zod ; 422 en cas d'échec. */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return res.status(422).json({
        error: { message: details[0]?.message || 'Données invalides.', details },
      });
    }
    req.body = result.data;
    next();
  };
}

module.exports = { validate };
