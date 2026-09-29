import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, buildQuery } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCategories } from '../hooks/useCategories';
import { useToast } from '../context/ToastContext';
import { Spinner, EmptyState, ErrorBox } from '../components/Feedback';
import TransactionForm from '../components/TransactionForm';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import { IconPlus, IconSearch, IconEdit, IconTrash, IconDownload } from '../components/Icons';
import { formatMoney, formatDate } from '../utils/format';

const DEFAULT_FILTERS = {
  q: '', type: '', categoryId: '', from: '', to: '', min: '', max: '',
};

export default function Transactions() {
  const { user } = useAuth();
  const currency = user?.currency || 'EUR';
  const toast = useToast();
  const { categories } = useCategories();

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('date_desc');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Recherche avec debounce
  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => ({ ...f, q: search })), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = buildQuery({ ...filters, page, limit: 12, sort });
      setData(await api.get(`/api/transactions${qs}`));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, page, sort]);

  useEffect(() => {
    load();
  }, [load]);

  // Retour en page 1 quand les filtres changent
  useEffect(() => {
    setPage(1);
  }, [filters, sort]);

  const set = (patch) => setFilters((f) => ({ ...f, ...patch }));
  const activeFilters = useMemo(
    () => Object.values(filters).filter((v) => v !== '').length,
    [filters]
  );

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (tx) => {
    setEditing(tx);
    setFormOpen(true);
  };

  const onSaved = () => {
    toast.success(editing ? 'Transaction modifiée.' : 'Transaction ajoutée.');
    load();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await api.del(`/api/transactions/${deleting.id}`);
      toast.success('Transaction supprimée.');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const filterCats = useMemo(() => {
    if (!filters.type) return categories;
    return categories.filter((c) => c.type === filters.type);
  }, [categories, filters.type]);

  // URL d'export CSV : mêmes filtres que la liste affichée
  const exportUrl = useMemo(
    () => `/api/transactions/export.csv${buildQuery(filters)}`,
    [filters]
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-strong">Transactions</h1>
          <p className="text-sm text-faint">Recherchez, filtrez et gérez toutes vos opérations.</p>
        </div>
        <div className="flex gap-2">
          <a
            className="btn-secondary"
            href={exportUrl}
            download
            title="Exporter les transactions filtrées au format CSV"
          >
            <IconDownload /> Exporter CSV
          </a>
          <button className="btn-primary" onClick={openCreate}>
            <IconPlus size={16} /> Nouvelle transaction
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="card space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">
              <IconSearch size={16} />
            </span>
            <input
              className="input !pl-9"
              placeholder="Rechercher une description, une catégorie…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="input" value={filters.type} onChange={(e) => set({ type: e.target.value, categoryId: '' })}>
            <option value="">Tous les types</option>
            <option value="expense">💸 Dépenses</option>
            <option value="income">💰 Revenus</option>
          </select>
          <select className="input" value={filters.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
            <option value="">Toutes les catégories</option>
            {filterCats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="label">Du</label>
            <input type="date" className="input" value={filters.from} onChange={(e) => set({ from: e.target.value })} />
          </div>
          <div>
            <label className="label">Au</label>
            <input type="date" className="input" value={filters.to} onChange={(e) => set({ to: e.target.value })} />
          </div>
          <div>
            <label className="label">Montant min</label>
            <input type="text" inputMode="decimal" className="input" placeholder="0" value={filters.min} onChange={(e) => set({ min: e.target.value })} />
          </div>
          <div>
            <label className="label">Montant max</label>
            <input type="text" inputMode="decimal" className="input" placeholder="∞" value={filters.max} onChange={(e) => set({ max: e.target.value })} />
          </div>
          <div>
            <label className="label">Tri</label>
            <select className="input" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="date_desc">Plus récentes</option>
              <option value="date_asc">Plus anciennes</option>
              <option value="amount_desc">Montant décroissant</option>
              <option value="amount_asc">Montant croissant</option>
            </select>
          </div>
        </div>
        {activeFilters > 0 && (
          <div className="flex items-center justify-between border-t border-line/5 pt-3">
            <p className="text-xs text-faint">
              {activeFilters} filtre{activeFilters > 1 ? 's' : ''} actif{activeFilters > 1 ? 's' : ''}
            </p>
            <button
              className="text-xs font-medium text-accent hover:text-accent"
              onClick={() => { setFilters(DEFAULT_FILTERS); setSearch(''); }}
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>

      {/* Totaux filtrés */}
      {data && !loading && data.pagination.total > 0 && (
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="chip bg-brand-500/10 text-accent ring-brand-500/25">
            Revenus : {formatMoney(data.totals.income, currency)}
          </span>
          <span className="chip bg-red-500/10 text-danger ring-red-500/25">
            Dépenses : {formatMoney(data.totals.expense, currency)}
          </span>
          <span className="chip bg-raised text-strong ring-line/10">
            Solde de la sélection : {formatMoney(data.totals.income - data.totals.expense, currency, { sign: true })}
          </span>
        </div>
      )}

      {/* Liste */}
      <div className="card">
        {loading ? (
          <Spinner label="Chargement des transactions…" />
        ) : error ? (
          <ErrorBox message={error} onRetry={load} />
        ) : !data || data.transactions.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="Aucune transaction trouvée"
            message="Modifiez vos filtres ou ajoutez une nouvelle transaction."
            action={
              <button className="btn-primary" onClick={openCreate}>
                <IconPlus size={16} /> Ajouter une transaction
              </button>
            }
          />
        ) : (
          <>
            <ul className="divide-y divide-line/5">
              {data.transactions.map((t) => (
                <li key={t.id} className="group flex items-center gap-3 px-4 py-3.5 transition hover:bg-line/5 sm:px-5">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                    style={{ backgroundColor: `${t.categoryColor}22`, color: t.categoryColor }}
                  >
                    {t.categoryIcon || '📦'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-strong">
                      {t.description || t.categoryName || 'Sans description'}
                    </p>
                    <p className="text-xs text-faint">
                      {t.categoryName || 'Sans catégorie'} · {formatDate(t.date)}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold ${t.type === 'income' ? 'text-accent' : 'text-danger'}`}
                  >
                    {t.type === 'income' ? '+' : '−'}
                    {formatMoney(t.amount, currency)}
                  </span>
                  <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      className="rounded-lg p-2 text-faint hover:bg-raised2 hover:text-strong"
                      onClick={() => openEdit(t)}
                      title="Modifier"
                    >
                      <IconEdit />
                    </button>
                    <button
                      className="rounded-lg p-2 text-faint hover:bg-red-500/10 hover:text-danger"
                      onClick={() => setDeleting(t)}
                      title="Supprimer"
                    >
                      <IconTrash />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="px-5 pb-4">
              <Pagination
                page={data.pagination.page}
                totalPages={data.pagination.totalPages}
                total={data.pagination.total}
                onPage={setPage}
              />
            </div>
          </>
        )}
      </div>

      <TransactionForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={onSaved}
        categories={categories}
        initial={editing}
        defaultType="expense"
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteLoading}
        title="Supprimer la transaction"
        message={`« ${deleting?.description || deleting?.categoryName || 'Sans description'} » (${deleting ? formatMoney(deleting.amount, currency) : ''}) sera définitivement supprimée.`}
      />
    </div>
  );
}
