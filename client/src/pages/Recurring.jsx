import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCategories } from '../hooks/useCategories';
import { useToast } from '../context/ToastContext';
import { Spinner, EmptyState, ErrorBox } from '../components/Feedback';
import RecurringForm from '../components/RecurringForm';
import ConfirmDialog from '../components/ConfirmDialog';
import { IconPlus, IconEdit, IconTrash, IconPause, IconPlay } from '../components/Icons';
import { formatMoney, formatDate, FREQUENCY_LABELS } from '../utils/format';

function RuleCard({ rule, currency, onEdit, onDelete, onToggle, toggling }) {
  const active = Boolean(rule.active);
  return (
    <div className={`card group p-4 transition ${active ? '' : 'opacity-60'}`}>
      <div className="flex items-center gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
          style={{ backgroundColor: `${rule.categoryColor}22`, color: rule.categoryColor }}
        >
          {rule.categoryIcon || '📦'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-strong">
            {rule.description || rule.categoryName || 'Transaction récurrente'}
          </p>
          <p className="text-xs text-faint">
            {rule.categoryName || 'Sans catégorie'} · {FREQUENCY_LABELS[rule.frequency]}
          </p>
        </div>
        <span className={`text-sm font-bold ${rule.type === 'income' ? 'text-accent' : 'text-danger'}`}>
          {rule.type === 'income' ? '+' : '−'}
          {formatMoney(rule.amount, currency)}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-line/5 pt-3">
        <div className="flex items-center gap-2 text-xs">
          <span className={`chip ${active ? 'bg-brand-500/10 text-accent ring-brand-500/25' : 'bg-raised text-faint ring-line/10'}`}>
            {active ? '● Active' : '⏸ En pause'}
          </span>
          {active && (
            <span className="text-faint">
              Prochaine : {formatDate(rule.nextRunDate)}
            </span>
          )}
        </div>
        <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
          <button
            className="rounded-lg p-2 text-faint hover:bg-raised2 hover:text-strong"
            onClick={() => onToggle(rule)}
            disabled={toggling}
            title={active ? 'Mettre en pause' : 'Reprendre'}
          >
            {active ? <IconPause /> : <IconPlay />}
          </button>
          <button
            className="rounded-lg p-2 text-faint hover:bg-raised2 hover:text-strong"
            onClick={() => onEdit(rule)}
            title="Modifier"
          >
            <IconEdit />
          </button>
          <button
            className="rounded-lg p-2 text-faint hover:bg-red-500/10 hover:text-danger"
            onClick={() => onDelete(rule)}
            title="Supprimer"
          >
            <IconTrash />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Recurring() {
  const { user } = useAuth();
  const currency = user?.currency || 'EUR';
  const toast = useToast();
  const { categories } = useCategories();

  const [rules, setRules] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await api.get('/api/recurring');
      setRules(d.rules);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (rule) => {
    setEditing(rule);
    setFormOpen(true);
  };

  const toggle = async (rule) => {
    setBusy(true);
    try {
      await api.patch(`/api/recurring/${rule.id}`, { active: !rule.active });
      toast.success(rule.active ? 'Récurrence mise en pause.' : 'Récurrence réactivée.');
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.del(`/api/recurring/${deleting.id}`);
      toast.success('Récurrence supprimée (les transactions déjà générées sont conservées).');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const activeCount = (rules || []).filter((r) => r.active).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-strong">Transactions récurrentes</h1>
          <p className="text-sm text-faint">
            Automatisez vos revenus et dépenses réguliers (loyer, salaire, abonnements…).
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <IconPlus size={16} /> Nouvelle récurrence
        </button>
      </div>

      {loading ? (
        <Spinner label="Chargement des récurrences…" />
      ) : error ? (
        <ErrorBox message={error} onRetry={load} />
      ) : !rules || rules.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="🔁"
            title="Aucune transaction récurrente"
            message="Créez une règle et l'application enregistrera automatiquement vos opérations à chaque échéance."
            action={
              <button className="btn-primary" onClick={openCreate}>
                <IconPlus size={16} /> Créer une récurrence
              </button>
            }
          />
        </div>
      ) : (
        <>
          <p className="text-sm text-faint">
            {activeCount} règle{activeCount > 1 ? 's' : ''} active{activeCount > 1 ? 's' : ''} sur{' '}
            {rules.length} — les transactions sont générées automatiquement à chaque échéance.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                currency={currency}
                onEdit={openEdit}
                onDelete={setDeleting}
                onToggle={toggle}
                toggling={busy}
              />
            ))}
          </div>
        </>
      )}

      <RecurringForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          toast.success(editing ? 'Récurrence modifiée.' : 'Récurrence créée.');
          load();
        }}
        categories={categories}
        initial={editing}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={busy}
        title="Supprimer la récurrence"
        message={`« ${deleting?.description || deleting?.categoryName} » ne générera plus de nouvelles transactions. Celles déjà enregistrées seront conservées.`}
      />
    </div>
  );
}
