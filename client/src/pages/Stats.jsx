import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { Spinner, EmptyState, ErrorBox } from '../components/Feedback';
import { formatMoney, shortMonthLabel, shiftMonth, currentMonth } from '../utils/format';

function ChartTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card !bg-slate-900 px-3 py-2 text-xs shadow-xl">
      {label && <p className="mb-1 font-semibold text-slate-300">{label}</p>}
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

export default function Stats() {
  const { user } = useAuth();
  const currency = user?.currency || 'EUR';

  const [period, setPeriod] = useState(6);
  const [data, setData] = useState({ monthly: [], byCat: [], daily: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const from = `${shiftMonth(currentMonth(), -(period - 1))}-01`;
      const [monthly, byCat, daily] = await Promise.all([
        api.get(`/api/stats/monthly?months=${period}`),
        api.get(`/api/stats/by-category?type=expense&from=${from}&to=${currentMonth()}-31`),
        api.get(`/api/stats/daily?month=${currentMonth()}`),
      ]);
      setData({ monthly: monthly.months, byCat: byCat.categories, daily: daily.days });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const areaData = useMemo(
    () =>
      data.monthly.map((m) => ({
        name: shortMonthLabel(m.month),
        Revenus: m.income,
        Dépenses: m.expense,
        Épargne: m.income - m.expense,
      })),
    [data.monthly]
  );

  const pieData = useMemo(
    () =>
      data.byCat.slice(0, 7).map((c) => ({
        name: `${c.icon} ${c.name}`,
        value: c.total,
        color: c.color,
      })),
    [data.byCat]
  );

  const dailyData = useMemo(() => {
    let cumulative = 0;
    return data.daily.map((d) => {
      cumulative += d.total;
      return { name: d.date.slice(8), Dépensé: d.total, Cumulé: cumulative };
    });
  }, [data.daily]);

  const totals = useMemo(() => {
    const income = data.monthly.reduce((s, m) => s + m.income, 0);
    const expense = data.monthly.reduce((s, m) => s + m.expense, 0);
    return { income, expense, saved: income - expense };
  }, [data.monthly]);

  const maxCatTotal = data.byCat[0]?.total || 1;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Statistiques</h1>
          <p className="text-sm text-slate-500">Analysez vos habitudes financières en détail.</p>
        </div>
        <div className="flex gap-1 rounded-xl bg-slate-800/70 p-1 ring-1 ring-white/10">
          {PERIODS.map((p) => (
            <button
              key={p.months}
              onClick={() => setPeriod(p.months)}
              className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                period === p.months
                  ? 'bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Spinner label="Calcul des statistiques…" />
      ) : error ? (
        <ErrorBox message={error} onRetry={load} />
      ) : (
        <>
          {/* Synthèse */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card p-5">
              <p className="text-sm text-slate-400">Revenus sur la période</p>
              <p className="mt-1 text-xl font-bold text-brand-400">{formatMoney(totals.income, currency)}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-slate-400">Dépenses sur la période</p>
              <p className="mt-1 text-xl font-bold text-red-400">{formatMoney(totals.expense, currency)}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-slate-400">Épargne sur la période</p>
              <p className={`mt-1 text-xl font-bold ${totals.saved >= 0 ? 'text-slate-100' : 'text-red-400'}`}>
                {formatMoney(totals.saved, currency, { sign: totals.saved < 0 })}
              </p>
            </div>
          </div>

          {/* Évolution */}
          <div className="card p-5">
            <h2 className="mb-4 font-semibold text-slate-200">Évolution mensuelle</h2>
            {areaData.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={areaData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v / 100}`}
                    width={60}
                  />
                  <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ stroke: '#334155' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="Revenus" stroke="#10b981" fill="url(#gIncome)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Dépenses" stroke="#f43f5e" fill="url(#gExpense)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon="📈" title="Pas assez de données" message="Ajoutez des transactions pour voir l'évolution." />
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Répartition */}
            <div className="card p-5">
              <h2 className="mb-4 font-semibold text-slate-200">Répartition des dépenses</h2>
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
                      formatter={(v) => <span style={{ color: '#94a3b8' }}>{v}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState icon="🧾" title="Aucune dépense sur la période" />
              )}
            </div>

            {/* Top catégories */}
            <div className="card p-5">
              <h2 className="mb-4 font-semibold text-slate-200">Top catégories de dépenses</h2>
              {data.byCat.length === 0 ? (
                <EmptyState icon="🏷️" title="Aucune dépense sur la période" />
              ) : (
                <ul className="space-y-3">
                  {data.byCat.slice(0, 6).map((c) => {
                    const pct = Math.round((c.total / maxCatTotal) * 100);
                    return (
                      <li key={c.id}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-slate-300">
                            <span>{c.icon}</span> {c.name}
                            <span className="text-xs text-slate-500">({c.count})</span>
                          </span>
                          <span className="font-semibold text-slate-200">
                            {formatMoney(c.total, currency)}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
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
            <h2 className="mb-4 font-semibold text-slate-200">Dépenses du mois en cours (cumul)</h2>
            {dailyData.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={dailyData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gDaily" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v / 100}`}
                    width={60}
                  />
                  <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ stroke: '#334155' }} />
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
