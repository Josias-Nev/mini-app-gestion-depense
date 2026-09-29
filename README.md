# MonBudget — Gestion des dépenses personnelles

Application web **full-stack** pour gérer ses finances personnelles : revenus, dépenses, catégories, budgets mensuels et statistiques.

![Stack](https://img.shields.io/badge/stack-React_18_·_Express_·_SQLite-10b981)

## Fonctionnalités

- **Authentification complète** : inscription, connexion, déconnexion — JWT en cookie `httpOnly`, mots de passe hachés (bcrypt), chaque utilisateur n'accède qu'à ses propres données.
- **Transactions** : création, modification, suppression ; recherche plein texte ; filtres par type, catégorie, période et montant ; tri ; pagination ; totaux de la sélection.
- **Catégories** : 16 catégories par défaut à l'inscription + catégories personnalisées (nom, type, icône emoji, couleur). Suppression protégée si la catégorie est utilisée.
- **Budgets** : budget mensuel par catégorie de dépense, suivi en temps réel des montants consommés avec barres de progression et alertes de dépassement (75 % / 100 %).
- **Tableau de bord** : solde total, revenus / dépenses du mois, reste budgétaire, graphique revenus vs dépenses sur 6 mois, répartition des dépenses par catégorie, dernières transactions.
- **Statistiques** : période 3/6/12 mois, évolution mensuelle, répartition des dépenses, top catégories, dépenses cumulées du mois en cours.
- **Profil** : nom, email, devise d'affichage (EUR, USD, XOF, GBP, CHF, CAD, MAD), changement de mot de passe.
- **Validations** des deux côtés (client + serveur avec Zod), gestion d'erreurs cohérente, montants stockés en **centimes** pour éviter les erreurs d'arrondi.

## Stack technique

| Couche | Technologies |
| ------ | ------------ |
| Front-end | React 18, Vite, React Router 6, Tailwind CSS 3, Recharts |
| Back-end | Node.js, Express 4, Zod, JWT (jsonwebtoken), bcryptjs |
| Base de données | SQLite (`better-sqlite3`, avec repli automatique sur `node:sqlite` — Node ≥ 22.5) |
| Tests | Tests d'intégration API (`node:test`, 15 scénarios) |

## Structure du projet

```
├── server/
│   └── src/
│       ├── index.js            # Point d'entrée (PORT=4000 par défaut)
│       ├── app.js              # Application Express (API + front statique)
│       ├── db.js               # Schéma SQLite + index
│       ├── dbClient.js         # Adaptateur better-sqlite3 / node:sqlite
│       ├── defaultCategories.js# Catégories créées à l'inscription
│       ├── seedDemo.js         # Données de démonstration
│       ├── middleware/         # auth (JWT), validate (Zod), errorHandler
│       └── routes/             # auth, users, categories, transactions, budgets, stats
│   └── tests/api.test.js       # Tests d'intégration (auth, CRUD, isolation…)
└── client/
    └── src/
        ├── api.js              # Client HTTP + gestion d'erreurs
        ├── context/            # AuthContext, ToastContext
        ├── components/         # Layout, Modal, TransactionForm, CategoryForm…
        └── pages/              # Dashboard, Transactions, Categories, Budgets, Stats, Profile
```

## Démarrage rapide

Prérequis : **Node.js ≥ 20** (≥ 22.5 recommandé pour le repli `node:sqlite`).

```bash
# 1. Installer les dépendances (serveur + client)
npm run install:all

# 2. Construire le front-end
npm run build

# 3. Démarrer (API + interface sur http://localhost:4000)
npm start
```

### Compte de démonstration

```bash
npm --prefix server run seed
# identifiants : demo@monbudget.fr / demo1234
```

### Développement (rechargement à chaud)

```bash
npm run dev          # API sur :4000 (watch)
npm run dev:client   # Vite sur :5173, proxy /api → :4000
```

### Tests

```bash
npm test             # 15 tests d'intégration API
```

## API (aperçu)

| Méthode | Route | Description |
| ------- | ----- | ----------- |
| POST | `/api/auth/register` · `/login` · `/logout` | Authentification |
| GET | `/api/auth/me` | Utilisateur courant |
| GET/POST | `/api/transactions` | Liste (filtres `q`, `type`, `categoryId`, `from`, `to`, `min`, `max`, `page`, `limit`, `sort`) · création |
| GET/PATCH/DELETE | `/api/transactions/:id` | Détail · modification · suppression |
| GET/POST/PATCH/DELETE | `/api/categories(/:id)` | Gestion des catégories |
| GET/PUT/DELETE | `/api/budgets(/:id)` | Budgets par mois (`PUT` = upsert) |
| GET | `/api/stats/overview` · `/by-category` · `/monthly` · `/daily` | Statistiques |
| PATCH | `/api/users/me` · `/me/password` | Profil et mot de passe |

Toutes les réponses d'erreur suivent le format `{ "error": { "message": "…", "details": [] } }`.

## Variables d'environnement

| Variable | Défaut | Rôle |
| -------- | ------ | ---- |
| `PORT` | `4000` | Port HTTP |
| `JWT_SECRET` | `dev-secret-…` | **À définir en production** |
| `DB_PATH` | `server/data/app.db` | Emplacement de la base SQLite |
| `NODE_ENV` | — | `production` active le cookie `Secure` |
