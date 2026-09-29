const { createApp } = require('./app');
const db = require('./db');
const { startRecurringScheduler } = require('./recurring');

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '0.0.0.0';

const app = createApp();

// Génère les transactions récurrentes au démarrage puis toutes les heures
startRecurringScheduler(db);

app.listen(PORT, HOST, () => {
  console.log(`✅ API + client disponibles sur http://${HOST}:${PORT}`);
});
