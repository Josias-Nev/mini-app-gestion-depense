/** Formatage des montants (stockés en centimes) et des dates. */

export function formatMoney(cents, currency = 'EUR', { sign = false } = {}) {
  const value = Math.abs(cents) / 100;
  const formatted = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(value);
  if (!sign) return formatted;
  return `${cents < 0 ? '−' : '+'}${formatted}`;
}

export function formatDate(iso) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${iso}T00:00:00`));
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export function currentMonth() {
  return todayISO().slice(0, 7);
}

export function monthLabel(month) {
  const [y, m] = month.split('-').map(Number);
  const label = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(
    new Date(y, m - 1, 1)
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function shortMonthLabel(month) {
  const [y, m] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(y, m - 1, 1));
}

export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export const FREQUENCY_LABELS = {
  daily: 'Tous les jours',
  weekly: 'Toutes les semaines',
  monthly: 'Tous les mois',
  yearly: 'Tous les ans',
};
