# MonBudget — Gestion des dépenses personnelles

Application web **full-stack** pour gérer ses finances personnelles : revenus, dépenses, catégories, budgets mensuels et statistiques.

![Stack](https://img.shields.io/badge/stack-React_18_·_Express_·_SQLite-10b981)

## Fonctionnalités

- **Authentification complète** : inscription, connexion, déconnexion — JWT en cookie `httpOnly`, mots de passe hachés (bcrypt), chaque utilisateur n'accède qu'à ses propres données.
- **Transactions** : création, modification, suppression ; recherche plein texte ; filtres par type, catégorie, période et montant ; tri ; pagination ; totaux de la sélection.
- **Export CSV** : export des transactions (avec les filtres actifs) compatible Excel — séparateur `;`, décimales françaises, BOM UTF-8.
- **Transactions récurrentes** : règles quotidiennes / hebdomadaires / mensuelles / annuelles (loyer, salaire, abonnements…) générées automatiquement à chaque échéance, avec pause / reprise et rattrapage des échéances passées.
- **Catégories** : 16 catégories par défaut à l'inscription + catégories personnalisées (nom, type, icône emoji, couleur). Suppression protégée si la catégorie est utilisée.
- **Budgets** : budget mensuel par catégorie de dépense, suivi en temps réel des montants consommés avec barres de progression et alertes de dépassement (75 % / 100 %).
- **Tableau de bord** : solde total, revenus / dépenses du mois, reste budgétaire, graphique revenus vs dépenses sur 6 mois, répartition des dépenses par catégorie, dernières transactions.
- **Statistiques** : période 3/6/12 mois, **évolution par sous-période** (jour, semaine ou mois sur plage de dates libre), répartition des dépenses, top catégories, dépenses cumulées du mois en cours.
- **Mode clair / sombre** : bascule instantanée, préférence système respectée au premier chargement, choix persisté.
- **Profil** : nom, email, devise d'affichage (EUR, USD, XOF, GBP, CHF, CAD, MAD), changement de mot de passe.
- **Validations** des deux côtés (client + serveur avec Zod), gestion d'erreurs cohérente, montants stockés en **centimes** pour éviter les erreurs d'arrondi.

## Stack technique

| Couche | Technologies |
| ------ | ------------ |
| Front-end | React 18, Vite, React Router 6, Tailwind CSS 3 (thème clair/sombre par variables CSS), Recharts |
| Back-end | Node.js, Express 4, Zod, JWT (jsonwebtoken), bcryptjs |
| Base de données | SQLite (`better-sqlite3`, avec repli automatique sur `node:sqlite` — Node ≥ 22.5) |
| Tests | Tests d'intégration API (`node:test`, 18 scénarios) |

## Structure du projet

```
├── server/
│   └── src/
│       ├── index.js            # Point d'entrée + planificateur de récurrences
│       ├── app.js              # Application Express (API + front statique)
│       ├── db.js               # Schéma SQLite + index
│       ├── dbClient.js         # Adaptateur better-sqlite3 / node:sqlite
│       ├── recurring.js        # Moteur de génération des récurrences
│       ├── defaultCategories.js# Catégories créées à l'inscription
│       ├── seedDemo.js         # Données de démonstration
│       ├── middleware/         # auth (JWT), validate (Zod), errorHandler
│       └── routes/             # auth, users, categories, transactions, budgets, stats, recurring
│   └── tests/api.test.js       # Tests d'intégration (auth, CRUD, CSV, récurrent, isolation…)
└── client/
    └── src/
        ├── api.js              # Client HTTP + gestion d'erreurs
        ├── theme.js            # Bascule clair/sombre (localStorage)
        ├── context/            # AuthContext, ToastContext
        ├── components/         # Layout, Modal, TransactionForm, CategoryForm, RecurringForm…
        └── pages/              # Dashboard, Transactions, Recurring, Categories, Budgets, Stats, Profile
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
| GET | `/api/transactions/export.csv` | Export CSV (mêmes filtres que la liste) |
| GET/POST/PATCH/DELETE | `/api/recurring(/:id)` | Transactions récurrentes (`PATCH` : montant, fréquence, `active`, prochaine échéance…) |
| GET/POST/PATCH/DELETE | `/api/categories(/:id)` | Gestion des catégories |
| GET/PUT/DELETE | `/api/budgets(/:id)` | Budgets par mois (`PUT` = upsert) |
| GET | `/api/stats/overview` · `/by-category` · `/monthly` · `/daily` | Statistiques |
| GET | `/api/stats/by-period?from=&to=&granularity=day\|week\|month` | Revenus/dépenses par sous-période |
| PATCH | `/api/users/me` · `/me/password` | Profil et mot de passe |

Toutes les réponses d'erreur suivent le format `{ "error": { "message": "…", "details": [] } }`.

## Variables d'environnement

| Variable | Défaut | Rôle |
| -------- | ------ | ---- |
| `PORT` | `4000` | Port HTTP |
| `JWT_SECRET` | `dev-secret-…` | **À définir en production** |
| `DB_PATH` | `server/data/app.db` | Emplacement de la base SQLite |
| `NODE_ENV` | — | `production` active le cookie `Secure` |
