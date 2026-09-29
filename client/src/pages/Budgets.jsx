import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCategories } from '../hooks/useCategories';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import { Spinner, EmptyState, ErrorBox } from '../components/Feedback';
import ConfirmDialog from '../components/ConfirmDialog';
import { IconPlus, IconChevronLeft, IconChevronRight, IconTrash, IconEdit } from '../components/Icons';
import { formatMoney, currentMonth, monthLabel, shiftMonth } from '../utils/format';

function BudgetForm({ open, onClose, onSaved, categories, month, initial }) {
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initial);

  useEffect(() => {
    if (!open) return;
    setError('');
    setCategoryId(initial?.categoryId ?? '');
    setAmount(initial ? (initial.amount / 100).toString() : '');
  }, [open, initial]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const value = parseFloat(String(amount).replace(',', '.'));
    if (!categoryId) {
      setError('Veuillez choisir une catégorie.');
      return;
    }
    if (Number.isNaN(value) || value <= 0) {
      setError('Veuillez saisir un montant valide supérieur à 0.');
      return;
    }
    setSaving(true);
    try {
      await api.put('/api/budgets', { categoryId: Number(categoryId), month, amount: value });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Modifier le budget' : `Nouveau budget — ${monthLabel(month)}`}
      maxWidth="max-w-md"
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && (
          <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/25">
            {error}
          </div>
        )}
        <div>
          <label className="label">Catégorie de dépense</label>
          <select
            className="input"
            value={categoryId}
            disabled={isEdit}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">— Choisir une catégorie —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Budget mensuel</label>
          <input
            type="text"
            inputMode="decimal"
            className="input"
            placeholder="Ex : 300"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Annuler
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function BudgetCard({ budget, currency, onEdit, onDelete }) {
  const ratio = budget.amount > 0 ? budget.spent / budget.amount : 0;
  const pct = Math.min(100, Math.round(ratio * 100));
  const remaining = budget.amount - budget.spent;
  const state = ratio >= 1 ? 'danger' : ratio >= 0.75 ? 'warn' : 'ok';
  const barColor = {
    ok: 'bg-brand-500',
    warn: 'bg-amber-400',
    danger: 'bg-red-500',
  }[state];

  return (
    <div className="card group p-5">
      <div className="flex items-center gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
          style={{ backgroundColor: `${budget.categoryColor}22`, color: budget.categoryColor }}
        >
          {budget.categoryIcon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-200">{budget.categoryName}</p>
          <p className="text-xs text-slate-500">
            {formatMoney(budget.spent, currency)} dépensés sur {formatMoney(budget.amount, currency)}
          </p>
        </div>
        <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
          <button
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-slate-200"
            onClick={() => onEdit(budget)}
            title="Modifier"
          >
            <IconEdit />
          </button>
          <button
            className="rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
            onClick={() => onDelete(budget)}
            title="Supprimer"
          >
            <IconTrash />
          </button>
        </div>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-slate-500">{pct}% utilisé</span>
        <span className={state === 'danger' ? 'font-semibold text-red-400' : 'text-slate-400'}>
          {remaining >= 0
            ? `${formatMoney(remaining, currency)} restants`
            : `Dépassé de ${formatMoney(-remaining, currency)} ⚠️`}
        </span>
      </div>
    </div>
  );
}

export default function Budgets() {
  const { user } = useAuth();
  const currency = user?.currency || 'EUR';
  const toast = useToast();
  const { categories } = useCategories();

  const [month, setMonth] = useState(currentMonth());
  const [budgets, setBudgets] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await api.get(`/api/budgets?month=${month}`);
      setBudgets(d.budgets);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    if (!budgets) return { budget: 0, spent: 0 };
    return {
      budget: budgets.reduce((s, b) => s + b.amount, 0),
      spent: budgets.reduce((s, b) => s + b.spent, 0),
    };
  }, [budgets]);

  const availableCategories = useMemo(() => {
    const used = new Set((budgets || []).map((b) => b.categoryId));
    return categories.filter((c) => c.type === 'expense' && !used.has(c.id));
  }, [categories, budgets]);

  const openEdit = (b) => {
    setEditing(b);
    setFormOpen(true);
  };
  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await api.del(`/api/budgets/${deleting.id}`);
      toast.success('Budget supprimé.');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const isCurrent = month === currentMonth();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Budgets</h1>
          <p className="text-sm text-slate-500">Fixez des limites de dépenses par catégorie et suivez-les.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary !px-3" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Mois précédent">
            <IconChevronLeft />
          </button>
          <span className="min-w-40 text-center text-sm font-semibold text-slate-200">
            {monthLabel(month)} {isCurrent && <span className="text-xs text-brand-400">· en cours</span>}
          </span>
          <button className="btn-secondary !px-3" onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label="Mois suivant">
            <IconChevronRight />
          </button>
        </div>
      </div>

      {/* Résumé */}
      {budgets && budgets.length > 0 && (
        <div className="card flex flex-wrap items-center gap-6 p-5">
          <div>
            <p className="text-xs text-slate-500">Budget total</p>
            <p className="text-xl font-bold text-slate-100">{formatMoney(totals.budget, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Dépensé</p>
            <p className="text-xl font-bold text-red-400">{formatMoney(totals.spent, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Restant</p>
            <p className={`text-xl font-bold ${totals.budget - totals.spent >= 0 ? 'text-brand-400' : 'text-red-400'}`}>
              {formatMoney(Math.abs(totals.budget - totals.spent), currency, { sign: totals.budget - totals.spent < 0 })}
            </p>
          </div>
          <div className="min-w-44 flex-1">
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full transition-all ${
                  totals.spent / totals.budget >= 1
                    ? 'bg-red-500'
                    : totals.spent / totals.budget >= 0.75
                      ? 'bg-amber-400'
                      : 'bg-brand-500'
                }`}
                style={{ width: `${Math.min(100, totals.budget ? Math.round((totals.spent / totals.budget) * 100) : 0)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              {totals.budget ? Math.round((totals.spent / totals.budget) * 100) : 0}% du budget global utilisé
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <Spinner label="Chargement des budgets…" />
      ) : error ? (
        <ErrorBox message={error} onRetry={load} />
      ) : !budgets || budgets.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="🎯"
            title={`Aucun budget pour ${monthLabel(month)}`}
            message="Définissez un budget par catégorie de dépense pour garder vos finances sous contrôle."
            action={
              <button className="btn-primary" onClick={openCreate}>
                <IconPlus size={16} /> Créer un budget
              </button>
            }
          />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {budgets.map((b) => (
              <BudgetCard key={b.id} budget={b} currency={currency} onEdit={openEdit} onDelete={setDeleting} />
            ))}
          </div>
          <div className="flex justify-center">
            <button className="btn-secondary" onClick={openCreate} disabled={availableCategories.length === 0}>
              <IconPlus size={16} />
              {availableCategories.length === 0
                ? 'Toutes les catégories ont un budget'
                : 'Ajouter un budget'}
            </button>
          </div>
        </>
      )}

      <BudgetForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => { toast.success('Budget enregistré.'); load(); }}
        categories={editing ? categories.filter((c) => c.type === 'expense') : availableCategories}
        month={editing?.month || month}
        initial={editing}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteLoading}
        title="Supprimer le budget"
        message={`Le budget « ${deleting?.categoryName} » de ${deleting ? monthLabel(deleting.month) : ''} sera supprimé. Les transactions ne seront pas affectées.`}
      />
    </div>
  );
}
