import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCategories } from '../hooks/useCategories';
import { useToast } from '../context/ToastContext';
import { Spinner, EmptyState, ErrorBox } from '../components/Feedback';
import TransactionForm from '../components/TransactionForm';
import { IconPlus, IconArrowUp, IconArrowDown, IconWallet } from '../components/Icons';
import { formatMoney, formatDate, shortMonthLabel, monthLabel } from '../utils/format';

function StatCard({ title, value, subtitle, icon, tone }) {
  const tones = {
    neutral: 'bg-slate-800 text-slate-300',
    up: 'bg-brand-500/15 text-brand-300',
    down: 'bg-red-500/15 text-red-300',
    budget: 'bg-blue-500/15 text-blue-300',
  };
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{title}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>
          {icon}
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-100">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}

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

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const currency = user?.currency || 'EUR';
  const { categories } = useCategories();

  const [data, setData] = useState({ overview: null, byCat: [], monthly: [], recent: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState('expense');

  const reload = useCallback(async () => {
    setError('');
    try {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const [overview, byCat, monthly, recent] = await Promise.all([
        api.get('/api/stats/overview'),
        api.get(`/api/stats/by-category?type=expense&from=${month}-01&to=${month}-31`),
        api.get('/api/stats/monthly?months=6'),
        api.get('/api/transactions?limit=6&sort=date_desc'),
      ]);
      setData({
        overview: overview,
        byCat: byCat.categories,
        monthly: monthly.months,
        recent: recent.transactions,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const openForm = (type) => {
    setFormType(type);
    setFormOpen(true);
  };

  const onSaved = () => {
    toast.success('Transaction enregistrée.');
    reload();
  };

  const pieData = useMemo(
    () =>
      data.byCat.slice(0, 8).map((c) => ({
        name: `${c.icon} ${c.name}`,
        value: c.total,
        color: c.color,
      })),
    [data.byCat]
  );

  const barData = useMemo(
    () =>
      data.monthly.map((m) => ({
        name: shortMonthLabel(m.month),
        Revenus: m.income,
        Dépenses: m.expense,
      })),
    [data.monthly]
  );

  if (loading) return <Spinner label="Chargement du tableau de bord…" />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const { overview } = data;
  const remaining = overview.totalBudget - overview.monthly.expense;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Bonjour, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-slate-500">
            Voici votre situation pour {monthLabel(overview.month)}.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => openForm('income')}>
            <IconArrowUp size={16} className="text-brand-400" /> Revenu
          </button>
          <button className="btn-primary" onClick={() => openForm('expense')}>
            <IconPlus size={16} /> Dépense
          </button>
        </div>
      </div>

      {/* Cartes */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Solde total"
          value={formatMoney(overview.balance, currency)}
          subtitle={`${overview.global.count} transaction(s) au total`}
          icon={<IconWallet size={18} />}
          tone="neutral"
        />
        <StatCard
          title="Revenus du mois"
          value={formatMoney(overview.monthly.income, currency)}
          subtitle={`${overview.month} — entrées d'argent`}
          icon={<IconArrowUp size={18} />}
          tone="up"
        />
        <StatCard
          title="Dépenses du mois"
          value={formatMoney(overview.monthly.expense, currency)}
          subtitle={`${overview.month} — sorties d'argent`}
          icon={<IconArrowDown size={18} />}
          tone="down"
        />
        <StatCard
          title="Budget du mois"
          value={overview.totalBudget > 0 ? formatMoney(remaining, currency, { sign: remaining < 0 }) : '—'}
          subtitle={
            overview.totalBudget > 0
              ? `sur ${formatMoney(overview.totalBudget, currency)} budgétisés`
              : 'Aucun budget défini ce mois-ci'
          }
          icon={<span className="text-base">🎯</span>}
          tone="budget"
        />
      </div>

      {/* Graphiques */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="card p-5 lg:col-span-3">
          <h2 className="mb-4 font-semibold text-slate-200">Revenus vs dépenses — 6 derniers mois</h2>
          {barData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v / 100}`}
                  width={60}
                />
                <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ fill: 'rgba(148,163,184,.06)' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Revenus" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={34} />
                <Bar dataKey="Dépenses" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={34} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="📊" title="Pas encore de données" message="Ajoutez des transactions pour voir l'évolution mensuelle." />
          )}
        </div>

        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold text-slate-200">Dépenses du mois par catégorie</h2>
          {pieData.length ? (
            <ResponsiveContainer width="100%" height={260}>
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
                  layout="horizontal"
                  verticalAlign="bottom"
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(v) => <span style={{ color: '#94a3b8' }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="🧾" title="Aucune dépense ce mois-ci" message="Vos dépenses du mois apparaîtront ici." />
          )}
        </div>
      </div>

      {/* Dernières transactions */}
      <div className="card">
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="font-semibold text-slate-200">Dernières transactions</h2>
          <Link to="/transactions" className="text-sm font-medium text-brand-400 hover:text-brand-300">
            Tout voir →
          </Link>
        </div>
        {data.recent.length === 0 ? (
          <EmptyState
            icon="💳"
            title="Aucune transaction"
            message="Enregistrez votre première dépense ou votre premier revenu pour démarrer."
            action={
              <button className="btn-primary" onClick={() => openForm('expense')}>
                <IconPlus size={16} /> Ajouter une transaction
              </button>
            }
          />
        ) : (
          <ul className="divide-y divide-white/5">
            {data.recent.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                  style={{ backgroundColor: `${t.categoryColor}22`, color: t.categoryColor }}
                >
                  {t.categoryIcon || '📦'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-200">
                    {t.description || t.categoryName || 'Sans description'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t.categoryName || 'Sans catégorie'} · {formatDate(t.date)}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    t.type === 'income' ? 'text-brand-400' : 'text-red-400'
                  }`}
                >
                  {t.type === 'income' ? '+' : '−'}
                  {formatMoney(t.amount, currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <TransactionForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={onSaved}
        categories={categories}
        defaultType={formType}
      />
    </div>
  );
}
