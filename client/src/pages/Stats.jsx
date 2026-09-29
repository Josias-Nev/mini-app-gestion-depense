import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { api, buildQuery } from '../api';
import { useAuth } from '../context/AuthContext';
import { Spinner, EmptyState, ErrorBox } from '../components/Feedback';
import {
  formatMoney,
  shortMonthLabel,
  shiftMonth,
  currentMonth,
  todayISO,
} from '../utils/format';

function ChartTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card !bg-surface px-3 py-2 text-xs shadow-xl">
      {label && <p className="mb-1 font-semibold text-strong">{label}</p>}
      {payload.map((p) => (
        <p key={p.dataKey ?? p.name} style={{ color: p.color || p.payload?.color }}>
          {p.name} : {formatMoney(p.value, currency)}
        </p>
      ))}
    </div>
  );
}

const PERIODS = [
  { months: 3, label: '3 mois' },
  { months: 6, label: '6 mois' },
  { months: 12, label: '12 mois' },
];

const GRANULARITIES = [
  { value: 'day', label: 'Jour' },
  { value: 'week', label: 'Semaine' },
  { value: 'month', label: 'Mois' },
];

function daysBetween(from, to) {
  return Math.round((new Date(to) - new Date(from)) / 86400000) + 1;
}

/** Granularité conseillée selon la longueur de la plage. */
function suggestedGranularity(spanDays) {
  if (spanDays <= 62) return 'day';
  if (spanDays <= 210) return 'week';
  return 'month';
}

function bucketLabel(period, granularity) {
  if (granularity === 'month') return shortMonthLabel(period.slice(0, 7));
  return `${period.slice(8)}/${period.slice(5, 7)}`;
}

export default function Stats() {
  const { user } = useAuth();
  const currency = user?.currency || 'EUR';

  // --- Données agrégées (périodes prédéfinies) ---
  const [period, setPeriod] = useState(6);
  const [agg, setAgg] = useState({ monthly: [], byCat: [], daily: [] });
  const [aggLoading, setAggLoading] = useState(true);
  const [aggError, setAggError] = useState('');

  // --- Graphique d'évolution par sous-période (plage libre) ---
  const [range, setRange] = useState({ from: '', to: '' });
  const [granularity, setGranularity] = useState('week');
  const [evolution, setEvolution] = useState(null);
  const [evoError, setEvoError] = useState('');

  // Quand la période change, la plage du graphique d'évolution suit
  useEffect(() => {
    const from = `${shiftMonth(currentMonth(), -(period - 1))}-01`;
    const to = todayISO();
    setRange({ from, to });
    setGranularity(suggestedGranularity(daysBetween(from, to)));
  }, [period]);

  const loadAgg = useCallback(async () => {
    setAggLoading(true);
    setAggError('');
    try {
      const from = `${shiftMonth(currentMonth(), -(period - 1))}-01`;
      const [monthly, byCat, daily] = await Promise.all([
        api.get(`/api/stats/monthly?months=${period}`),
        api.get(`/api/stats/by-category?type=expense&from=${from}&to=${currentMonth()}-31`),
        api.get(`/api/stats/daily?month=${currentMonth()}`),
      ]);
      setAgg({ monthly: monthly.months, byCat: byCat.categories, daily: daily.days });
    } catch (err) {
      setAggError(err.message);
    } finally {
      setAggLoading(false);
    }
  }, [period]);

  const loadEvolution = useCallback(async () => {
    if (!range.from || !range.to || range.from > range.to) {
      setEvolution(null);
      return;
    }
    setEvoError('');
    try {
      const qs = buildQuery({ from: range.from, to: range.to, granularity });
      const d = await api.get(`/api/stats/by-period${qs}`);
      setEvolution(d);
    } catch (err) {
      setEvolution(null);
      setEvoError(err.message);
    }
  }, [range, granularity]);

  useEffect(() => {
    loadAgg();
  }, [loadAgg]);
  useEffect(() => {
    loadEvolution();
  }, [loadEvolution]);

  const totals = useMemo(() => {
    const income = agg.monthly.reduce((s, m) => s + m.income, 0);
    const expense = agg.monthly.reduce((s, m) => s + m.expense, 0);
    return { income, expense, saved: income - expense };
  }, [agg.monthly]);

  const pieData = useMemo(
    () =>
      agg.byCat.slice(0, 7).map((c) => ({
        name: `${c.icon} ${c.name}`,
        value: c.total,
        color: c.color,
      })),
    [agg.byCat]
  );

  const dailyData = useMemo(() => {
    let cumulative = 0;
    return agg.daily.map((d) => {
      cumulative += d.total;
      return { name: d.date.slice(8), Cumulé: cumulative };
    });
  }, [agg.daily]);

  const evoData = useMemo(
    () =>
      (evolution?.points || []).map((p) => ({
        name: bucketLabel(p.period, granularity),
        Revenus: p.income,
        Dépenses: p.expense,
      })),
    [evolution, granularity]
  );

  const span = range.from && range.to ? daysBetween(range.from, range.to) : 0;
  const granAllowed = {
    day: span <= 62,
    week: span <= 366,
    month: true,
  };

  const maxCatTotal = agg.byCat[0]?.total || 1;
  const EvoChart = evoData.length > 24 ? BarChart : AreaChart;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-strong">Statistiques</h1>
          <p className="text-sm text-faint">Analysez vos habitudes financières en détail.</p>
        </div>
        <div className="flex gap-1 rounded-xl bg-raised/70 p-1 ring-1 ring-line/10">
          {PERIODS.map((p) => (
            <button
              key={p.months}
              onClick={() => setPeriod(p.months)}
              className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                period === p.months
                  ? 'bg-brand-500/20 text-accent ring-1 ring-brand-500/30'
                  : 'text-mute hover:text-strong'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {aggLoading ? (
        <Spinner label="Calcul des statistiques…" />
      ) : aggError ? (
        <ErrorBox message={aggError} onRetry={loadAgg} />
      ) : (
        <>
          {/* Synthèse */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card p-5">
              <p className="text-sm text-mute">Revenus sur la période</p>
              <p className="mt-1 text-xl font-bold text-accent">{formatMoney(totals.income, currency)}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-mute">Dépenses sur la période</p>
              <p className="mt-1 text-xl font-bold text-danger">{formatMoney(totals.expense, currency)}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-mute">Épargne sur la période</p>
              <p className={`mt-1 text-xl font-bold ${totals.saved >= 0 ? 'text-strong' : 'text-danger'}`}>
                {formatMoney(totals.saved, currency, { sign: totals.saved < 0 })}
              </p>
            </div>
          </div>

          {/* Évolution par sous-période */}
          <div className="card p-5">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-semibold text-strong">Évolution par sous-période</h2>
                <p className="text-xs text-faint">
                  Revenus et dépenses détaillés par jour, semaine ou mois sur la plage de votre choix.
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="label">Du</label>
                  <input
                    type="date"
                    className="input !w-auto"
                    value={range.from}
                    max={range.to}
                    onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Au</label>
                  <input
                    type="date"
                    className="input !w-auto"
                    value={range.to}
                    min={range.from}
                    max={todayISO()}
                    onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                  />
                </div>
                <div className="flex gap-1 rounded-xl bg-raised/70 p-1 ring-1 ring-line/10">
                  {GRANULARITIES.map((g) => (
                    <button
                      key={g.value}
                      disabled={!granAllowed[g.value]}
                      onClick={() => setGranularity(g.value)}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                        granularity === g.value
                          ? 'bg-brand-500/20 text-accent ring-1 ring-brand-500/30'
                          : 'text-mute hover:text-strong'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {evoError ? (
              <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-danger ring-1 ring-red-500/25">
                {evoError}
              </div>
            ) : evoData.length === 0 ? (
              <EmptyState icon="📈" title="Pas de données sur cette plage" message="Ajustez les dates ou ajoutez des transactions." />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                {EvoChart === BarChart ? (
                  <BarChart data={evoData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--c-raised2))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: 'rgb(var(--c-mute))', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: 'rgb(var(--c-mute))', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 100}`} width={60} />
                    <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ fill: 'rgba(var(--c-mute),.06)' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Revenus" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={22} />
                    <Bar dataKey="Dépenses" fill="#f43f5e" radius={[3, 3, 0, 0]} maxBarSize={22} />
                  </BarChart>
                ) : (
                  <AreaChart data={evoData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--c-raised2))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: 'rgb(var(--c-mute))', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgb(var(--c-mute))', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 100}`} width={60} />
                    <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ stroke: 'rgb(var(--c-raised2))' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="Revenus" stroke="#10b981" fill="url(#gIncome)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Dépenses" stroke="#f43f5e" fill="url(#gExpense)" strokeWidth={2} />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Répartition */}
            <div className="card p-5">
              <h2 className="mb-4 font-semibold text-strong">Répartition des dépenses</h2>
              {pieData.length ? (
                <ResponsiveContainer width="100%" height={270}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip currency={currency} />} />
                    <Legend
                      verticalAlign="bottom"
                      wrapperStyle={{ fontSize: 11 }}
                      formatter={(v) => <span style={{ color: 'rgb(var(--c-mute))' }}>{v}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState icon="🧾" title="Aucune dépense sur la période" />
              )}
            </div>

            {/* Top catégories */}
            <div className="card p-5">
              <h2 className="mb-4 font-semibold text-strong">Top catégories de dépenses</h2>
              {agg.byCat.length === 0 ? (
                <EmptyState icon="🏷️" title="Aucune dépense sur la période" />
              ) : (
                <ul className="space-y-3">
                  {agg.byCat.slice(0, 6).map((c) => {
                    const pct = Math.round((c.total / maxCatTotal) * 100);
                    return (
                      <li key={c.id}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-strong">
                            <span>{c.icon}</span> {c.name}
                            <span className="text-xs text-faint">({c.count})</span>
                          </span>
                          <span className="font-semibold text-strong">
                            {formatMoney(c.total, currency)}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-raised">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: c.color }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Dépenses du mois en cours, cumul jour par jour */}
          <div className="card p-5">
            <h2 className="mb-4 font-semibold text-strong">Dépenses du mois en cours (cumul)</h2>
            {dailyData.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={dailyData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gDaily" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--c-raised2))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: 'rgb(var(--c-mute))', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: 'rgb(var(--c-mute))', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v / 100}`}
                    width={60}
                  />
                  <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ stroke: 'rgb(var(--c-raised2))' }} />
                  <Area type="monotone" dataKey="Cumulé" stroke="#3b82f6" fill="url(#gDaily)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon="🗓️" title="Aucune dépense ce mois-ci" />
            )}
          </div>
        </>
      )}
    </div>
  );
}
