/**
 * Moteur des transactions récurrentes.
 *
 * Pour chaque règle active dont l'échéance (next_run_date) est passée,
 * génère les transactions dues puis avance l'échéance au-delà d'aujourd'hui.
 * Toutes les dates sont manipulées en chaînes ISO (YYYY-MM-DD) en UTC pour
 * éviter les problèmes de fuseau horaire.
 */

function daysInMonth(year, month1to12) {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

function toDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toISO(date) {
  return date.toISOString().slice(0, 10);
}

/** Calcule l'échéance suivante en conservant le jour du mois si possible. */
function advanceDate(iso, frequency) {
  const d = toDate(iso);
  if (frequency === 'daily') {
    d.setUTCDate(d.getUTCDate() + 1);
  } else if (frequency === 'weekly') {
    d.setUTCDate(d.getUTCDate() + 7);
  } else if (frequency === 'monthly') {
    const day = d.getUTCDate();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + 1);
    d.setUTCDate(Math.min(day, daysInMonth(d.getUTCFullYear(), d.getUTCMonth() + 1)));
  } else {
    // yearly : 29 février → 28 février les années non bissextiles
    const day = d.getUTCDate();
    const month = d.getUTCMonth();
    d.setUTCDate(1);
    d.setUTCFullYear(d.getUTCFullYear() + 1);
    d.setUTCMonth(month);
    d.setUTCDate(Math.min(day, daysInMonth(d.getUTCFullYear(), month + 1)));
  }
  return toISO(d);
}

/** Nombre maximal d'occurrences générées d'un coup par règle (anti-dérive). */
const MAX_CATCH_UP = 366;

/**
 * Génère les transactions dues.
 * @param {import('./dbClient').Database} db
 * @param {{ userId?: number, today?: string }} [opts]
 * @returns {{ created: number, rulesProcessed: number }}
 */
function processRecurringRules(db, { userId = null, today = null } = {}) {
  const todayStr = today || new Date().toISOString().slice(0, 10);
  const rules = userId
    ? db
        .prepare(
          'SELECT * FROM recurring_rules WHERE active = 1 AND next_run_date <= ? AND user_id = ?'
        )
        .all(todayStr, userId)
    : db
        .prepare('SELECT * FROM recurring_rules WHERE active = 1 AND next_run_date <= ?')
        .all(todayStr);

  if (rules.length === 0) return { created: 0, rulesProcessed: 0 };

  const insertTx = db.prepare(
    `INSERT INTO transactions (user_id, category_id, type, amount, description, date)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const bump = db.prepare(
    "UPDATE recurring_rules SET next_run_date = ?, updated_at = datetime('now') WHERE id = ?"
  );

  let created = 0;
  const run = db.transaction(() => {
    for (const rule of rules) {
      let next = rule.next_run_date;
      let guard = 0;
      while (next <= todayStr && guard < MAX_CATCH_UP) {
        insertTx.run(
          rule.user_id,
          rule.category_id,
          rule.type,
          rule.amount,
          rule.description || 'Transaction récurrente',
          next
        );
        created += 1;
        guard += 1;
        next = advanceDate(next, rule.frequency);
      }
      bump.run(next, rule.id);
    }
  });
  run();
  return { created, rulesProcessed: rules.length };
}

/** Lance le traitement au démarrage puis périodiquement (toutes les heures). */
function startRecurringScheduler(db, intervalMs = 60 * 60 * 1000) {
  const tick = () => {
    try {
      const { created } = processRecurringRules(db);
      if (created > 0) {
        console.log(`[recurring] ${created} transaction(s) générée(s).`);
      }
    } catch (err) {
      console.error('[recurring] erreur :', err);
    }
  };
  tick();
  const timer = setInterval(tick, intervalMs);
  timer.unref(); // ne garde pas le processus en vie
  return timer;
}

module.exports = { advanceDate, processRecurringRules, startRecurringScheduler };
