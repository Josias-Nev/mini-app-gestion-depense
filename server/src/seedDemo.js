/**
 * Génère un compte de démonstration avec des données réalistes.
 * Usage : npm run seed
 *   → crée l'utilisateur  demo@monbudget.fr / demo1234  (ou le met à jour si déjà présent)
 */
const bcrypt = require('bcryptjs');
const db = require('./db');
const { seedDefaultCategories } = require('./defaultCategories');

const EMAIL = 'demo@monbudget.fr';
const PASSWORD = 'demo1234';

function monthKey(offset) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function run() {
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(EMAIL);
  if (user) {
    db.prepare('DELETE FROM transactions WHERE user_id = ?').run(user.id);
    db.prepare('DELETE FROM budgets WHERE user_id = ?').run(user.id);
    console.log('ℹ️  Compte démo existant : données réinitialisées.');
  } else {
    const info = db
      .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
      .run('Compte Démo', EMAIL, bcrypt.hashSync(PASSWORD, 10));
    user = { id: info.lastInsertRowid };
    seedDefaultCategories(db, user.id);
    console.log('ℹ️  Compte démo créé.');
  }

  const cats = db.prepare('SELECT * FROM categories WHERE user_id = ?').all(user.id);
  const cat = (name) => cats.find((c) => c.name === name);
  const insertTx = db.prepare(
    `INSERT INTO transactions (user_id, category_id, type, amount, description, date)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const expensePlan = [
    // [catégorie, libellés, montant min (€), montant max (€), occurrences/mois]
    ['Alimentation', ['Courses supermarché', 'Marché', 'Boulangerie'], 15, 90, 9],
    ['Restaurants', ['Déjeuner équipe', 'Pizza entre amis', 'Resto du week-end'], 8, 45, 3],
    ['Logement', ['Loyer'], 650, 650, 1],
    ['Transport', ['Essence', 'Pass transport', 'Taxi'], 10, 60, 4],
    ['Santé', ['Pharmacie', 'Médecin'], 8, 60, 1],
    ['Loisirs', ['Cinéma', 'Jeux Steam', 'Concert'], 10, 55, 3],
    ['Shopping', ['Vêtements', 'Cadeau anniversaire'], 19, 120, 2],
    ['Abonnements', ['Netflix', 'Spotify', 'Salle de sport', 'Forfait mobile'], 9, 35, 3],
    ['Factures', ['Électricité', 'Internet', "Assurance habitation"], 25, 70, 2],
  ];

  let txCount = 0;
  let budgetCount = 0;

  const seedAll = db.transaction(() => {
    // 6 mois d'historique
    for (let m = 5; m >= 0; m -= 1) {
      const mk = monthKey(m);
      // Salaire + petit revenu occasionnel
      insertTx.run(user.id, cat('Salaire').id, 'income', 265000, 'Salaire mensuel', `${mk}-01`);
      txCount += 1;
      if (m % 2 === 0) {
        insertTx.run(user.id, cat('Freelance').id, 'income', 35000, 'Mission freelance', `${mk}-12`);
        txCount += 1;
      }

      for (const [name, labels, min, max, perMonth] of expensePlan) {
        for (let i = 0; i < perMonth; i += 1) {
          const day = pad(1 + Math.floor(Math.random() * 27));
          const amount = Math.round((min + Math.random() * (max - min)) * 100);
          const label = labels[Math.floor(Math.random() * labels.length)];
          insertTx.run(user.id, cat(name).id, 'expense', amount, label, `${mk}-${day}`);
          txCount += 1;
        }
      }
    }

    // Budgets du mois courant
    const upsertBudget = db.prepare(
      `INSERT INTO budgets (user_id, category_id, month, amount)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, category_id, month) DO UPDATE SET amount = excluded.amount`
    );
    const mk = monthKey(0);
    const budgetPlan = [
      ['Alimentation', 400], ['Restaurants', 100], ['Transport', 150],
      ['Loisirs', 120], ['Shopping', 150], ['Abonnements', 80], ['Factures', 150],
    ];
    for (const [name, euros] of budgetPlan) {
      upsertBudget.run(user.id, cat(name).id, mk, euros * 100);
      budgetCount += 1;
    }
  });

  seedAll();
  console.log(`✅ Démo prête : ${txCount} transactions et ${budgetCount} budgets.`);
  console.log(`   Identifiants : ${EMAIL} / ${PASSWORD}`);
}

run();
