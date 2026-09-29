const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Base SQLite temporaire, avant tout chargement de l'app
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gd-test-'));
process.env.DB_PATH = path.join(tmpDir, 'test.db');
process.env.JWT_SECRET = 'test-secret';

const { createApp } = require('../src/app');

let server;
let baseUrl;

function client() {
  let token = null;
  return {
    setToken(t) { token = t; },
    async req(method, url, body) {
      const res = await fetch(baseUrl + url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      let data = null;
      try { data = await res.json(); } catch { /* réponse vide */ }
      return { status: res.status, data };
    },
    get(u) { return this.req('GET', u); },
    post(u, b) { return this.req('POST', u, b); },
    put(u, b) { return this.req('PUT', u, b); },
    patch(u, b) { return this.req('PATCH', u, b); },
    del(u) { return this.req('DELETE', u); },
  };
}

const alice = client();
const bob = client();

before(async () => {
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server?.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ------------------------------ AUTH ------------------------------

test('health check', async () => {
  const r = await alice.get('/api/health');
  assert.equal(r.status, 200);
  assert.equal(r.data.ok, true);
});

test('inscription : validation des champs', async () => {
  let r = await alice.post('/api/auth/register', { name: 'A', email: 'bad', password: '123' });
  assert.equal(r.status, 422);
  r = await alice.post('/api/auth/register', { name: 'Alice', email: 'alice@test.fr', password: 'motdepasse1' });
  assert.equal(r.status, 201);
  assert.equal(r.data.user.email, 'alice@test.fr');
  assert.ok(r.data.token);
  alice.setToken(r.data.token);
});

test('inscription : email dupliqué refusé', async () => {
  const r = await alice.post('/api/auth/register', { name: 'Alice 2', email: 'alice@test.fr', password: 'motdepasse1' });
  assert.equal(r.status, 409);
});

test('connexion : mauvais mot de passe refusé, bon accepté', async () => {
  let r = await alice.post('/api/auth/login', { email: 'alice@test.fr', password: 'faux' });
  assert.equal(r.status, 401);
  r = await alice.post('/api/auth/login', { email: 'alice@test.fr', password: 'motdepasse1' });
  assert.equal(r.status, 200);
  r = await bob.post('/api/auth/register', { name: 'Bob', email: 'bob@test.fr', password: 'motdepasse2' });
  assert.equal(r.status, 201);
  bob.setToken(r.data.token);
});

test('route protégée sans token → 401', async () => {
  const anon = client();
  const r = await anon.get('/api/transactions');
  assert.equal(r.status, 401);
});

test('GET /api/auth/me', async () => {
  const r = await alice.get('/api/auth/me');
  assert.equal(r.status, 200);
  assert.equal(r.data.user.name, 'Alice');
});

// --------------------------- CATÉGORIES ---------------------------

test('catégories par défaut créées à l’inscription', async () => {
  const r = await alice.get('/api/categories');
  assert.equal(r.status, 200);
  assert.ok(r.data.categories.length >= 10);
  assert.ok(r.data.categories.some((c) => c.name === 'Alimentation' && c.type === 'expense'));
  assert.ok(r.data.categories.some((c) => c.name === 'Salaire' && c.type === 'income'));
});

let customCatId;
test('CRUD catégories', async () => {
  let r = await alice.post('/api/categories', { name: 'Sport', type: 'expense', color: '#ff0000', icon: '⚽' });
  assert.equal(r.status, 201);
  customCatId = r.data.category.id;

  // doublon refusé
  r = await alice.post('/api/categories', { name: 'Sport', type: 'expense', color: '#ff0000', icon: '⚽' });
  assert.equal(r.status, 409);

  // modification
  r = await alice.patch(`/api/categories/${customCatId}`, { name: 'Sport & Fitness', type: 'expense', color: '#00ff00', icon: '🏋️' });
  assert.equal(r.status, 200);
  assert.equal(r.data.category.name, 'Sport & Fitness');

  // couleur invalide
  r = await alice.patch(`/api/categories/${customCatId}`, { name: 'X', type: 'expense', color: 'rouge', icon: '🏋️' });
  assert.equal(r.status, 422);

  // Bob ne peut pas toucher à la catégorie d'Alice
  r = await bob.del(`/api/categories/${customCatId}`);
  assert.equal(r.status, 404);
});

// -------------------------- TRANSACTIONS --------------------------

let txId;
let foodCatId;
let salaryCatId;

test('création de transactions + validations', async () => {
  const cats = (await alice.get('/api/categories')).data.categories;
  foodCatId = cats.find((c) => c.name === 'Alimentation').id;
  salaryCatId = cats.find((c) => c.name === 'Salaire').id;

  // montant négatif refusé
  let r = await alice.post('/api/transactions', { type: 'expense', amount: -5, categoryId: foodCatId, date: '2026-09-01' });
  assert.equal(r.status, 422);

  // mauvaise combinaison type/catégorie refusée
  r = await alice.post('/api/transactions', { type: 'expense', amount: 5, categoryId: salaryCatId, date: '2026-09-01' });
  assert.equal(r.status, 400);

  // date invalide refusée
  r = await alice.post('/api/transactions', { type: 'expense', amount: 5, categoryId: foodCatId, date: '01/09/2026' });
  assert.equal(r.status, 422);

  // créations valides
  r = await alice.post('/api/transactions', { type: 'expense', amount: 42.5, categoryId: foodCatId, date: '2026-09-10', description: 'Courses Carrefour' });
  assert.equal(r.status, 201);
  assert.equal(r.data.transaction.amount, 4250); // stocké en centimes
  txId = r.data.transaction.id;

  await alice.post('/api/transactions', { type: 'income', amount: 2500, categoryId: salaryCatId, date: '2026-09-01', description: 'Salaire septembre' });
  await alice.post('/api/transactions', { type: 'expense', amount: 12.9, categoryId: foodCatId, date: '2026-08-15', description: 'Sandwich' });
});

test('liste, filtres, recherche et pagination', async () => {
  let r = await alice.get('/api/transactions?type=expense');
  assert.equal(r.status, 200);
  assert.equal(r.data.pagination.total, 2);

  r = await alice.get('/api/transactions?q=carrefour');
  assert.equal(r.data.pagination.total, 1);

  r = await alice.get('/api/transactions?from=2026-09-01&to=2026-09-30');
  assert.equal(r.data.pagination.total, 2);

  r = await alice.get('/api/transactions?categoryId=' + foodCatId);
  assert.equal(r.data.pagination.total, 2);

  r = await alice.get('/api/transactions?limit=1&page=2&sort=date_desc');
  assert.equal(r.data.transactions.length, 1);
  assert.equal(r.data.pagination.totalPages, 3);

  // totaux filtrés cohérents
  r = await alice.get('/api/transactions?month=&type=income');
  assert.equal(r.data.totals.income, 250000);
});

test('modification et suppression de transaction', async () => {
  let r = await alice.patch(`/api/transactions/${txId}`, {
    type: 'expense', amount: 50, categoryId: foodCatId, date: '2026-09-11', description: 'Courses modifiées',
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.transaction.amount, 5000);

  // Bob ne peut pas supprimer la transaction d'Alice
  r = await bob.del(`/api/transactions/${txId}`);
  assert.equal(r.status, 404);

  r = await alice.del(`/api/transactions/${txId}`);
  assert.equal(r.status, 200);
  r = await alice.get(`/api/transactions/${txId}`);
  assert.equal(r.status, 404);
});

// ----------------------------- BUDGETS ----------------------------

let budgetId;
test('budgets : création (upsert), lecture avec dépenses, suppression', async () => {
  // une dépense de septembre dans la catégorie pour vérifier le calcul "spent"
  let r = await alice.post('/api/transactions', { type: 'expense', amount: 30, categoryId: foodCatId, date: '2026-09-20', description: 'Marché' });
  assert.equal(r.status, 201);

  r = await alice.put('/api/budgets', { categoryId: foodCatId, month: '2026-09', amount: 300 });
  assert.equal(r.status, 201);
  budgetId = r.data.budget.id;

  // upsert : même mois + catégorie → mise à jour, pas de doublon
  r = await alice.put('/api/budgets', { categoryId: foodCatId, month: '2026-09', amount: 250 });
  assert.equal(r.status, 201);

  r = await alice.get('/api/budgets?month=2026-09');
  assert.equal(r.status, 200);
  assert.equal(r.data.budgets.length, 1);
  assert.equal(r.data.budgets[0].amount, 25000);
  assert.equal(r.data.budgets[0].spent, 3000); // le sandwich d'août n'est pas compté

  // budget sur catégorie de revenu refusé
  r = await alice.put('/api/budgets', { categoryId: salaryCatId, month: '2026-09', amount: 100 });
  assert.equal(r.status, 404);

  // mois invalide
  r = await alice.get('/api/budgets?month=2026-13');
  assert.equal(r.status, 400);

  r = await alice.del(`/api/budgets/${budgetId}`);
  assert.equal(r.status, 200);
});

// ------------------------------ STATS -----------------------------

test('statistiques : overview, by-category, monthly, daily', async () => {
  let r = await alice.get('/api/stats/overview');
  assert.equal(r.status, 200);
  assert.equal(r.data.global.income, 250000);
  assert.equal(r.data.global.expense, 1290 + 3000);
  assert.equal(r.data.balance, 250000 - 4290);

  r = await alice.get('/api/stats/by-category?type=expense');
  assert.equal(r.status, 200);
  assert.equal(r.data.categories[0].name, 'Alimentation');
  assert.equal(r.data.categories[0].total, 4290);

  r = await alice.get('/api/stats/monthly?months=6');
  assert.equal(r.status, 200);
  assert.equal(r.data.months.length, 2); // août + septembre

  r = await alice.get('/api/stats/daily?month=2026-08');
  assert.equal(r.status, 200);
  assert.equal(r.data.days.length, 1);
  assert.equal(r.data.days[0].total, 1290);
});

// ---------------------------- PROFIL ------------------------------

test('profil : mise à jour infos + mot de passe', async () => {
  let r = await alice.patch('/api/users/me', { name: 'Alice Martin', email: 'alice@test.fr', currency: 'XOF' });
  assert.equal(r.status, 200);
  assert.equal(r.data.user.currency, 'XOF');

  // email déjà pris par Bob
  r = await alice.patch('/api/users/me', { name: 'Alice Martin', email: 'bob@test.fr', currency: 'EUR' });
  assert.equal(r.status, 409);

  // mauvais mot de passe actuel
  r = await alice.patch('/api/users/me/password', { currentPassword: 'faux', newPassword: 'nouveaumdp1' });
  assert.equal(r.status, 400);

  r = await alice.patch('/api/users/me/password', { currentPassword: 'motdepasse1', newPassword: 'nouveaumdp1' });
  assert.equal(r.status, 200);

  // reconnexion avec le nouveau mot de passe
  r = await alice.post('/api/auth/login', { email: 'alice@test.fr', password: 'nouveaumdp1' });
  assert.equal(r.status, 200);
});

test('isolation des données entre utilisateurs', async () => {
  const r = await bob.get('/api/stats/overview');
  assert.equal(r.status, 200);
  assert.equal(r.data.global.count, 0); // Bob n'a aucune transaction
});
