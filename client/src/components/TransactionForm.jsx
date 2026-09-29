import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import Modal from './Modal';
import { todayISO } from '../utils/format';

const EMPTY = { type: 'expense', amount: '', categoryId: '', date: todayISO(), description: '' };

/**
 * Formulaire de création / modification d'une transaction.
 * props:
 *  - open, onClose, onSaved
 *  - categories  : liste complète des catégories
 *  - initial     : transaction à modifier (null → création)
 *  - defaultType : type présélectionné en création
 */
export default function TransactionForm({ open, onClose, onSaved, categories, initial, defaultType = 'expense' }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initial);

  useEffect(() => {
    if (!open) return;
    setError('');
    if (initial) {
      setForm({
        type: initial.type,
        amount: (initial.amount / 100).toString(),
        categoryId: initial.categoryId ?? '',
        date: initial.date,
        description: initial.description || '',
      });
    } else {
      setForm({ ...EMPTY, type: defaultType, date: todayISO() });
    }
  }, [open, initial, defaultType]);

  const filteredCats = useMemo(
    () => categories.filter((c) => c.type === form.type),
    [categories, form.type]
  );

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const amount = parseFloat(String(form.amount).replace(',', '.'));
    if (Number.isNaN(amount) || amount <= 0) {
      setError('Veuillez saisir un montant valide supérieur à 0.');
      return;
    }
    if (!form.categoryId) {
      setError('Veuillez choisir une catégorie.');
      return;
    }
    if (!form.date) {
      setError('Veuillez choisir une date.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        type: form.type,
        amount,
        categoryId: Number(form.categoryId),
        date: form.date,
        description: form.description.trim(),
      };
      if (isEdit) await api.patch(`/api/transactions/${initial.id}`, payload);
      else await api.post('/api/transactions', payload);
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
      title={isEdit ? 'Modifier la transaction' : 'Nouvelle transaction'}
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && (
          <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/25">
            {error}
          </div>
        )}

        {/* Type */}
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-800/70 p-1 ring-1 ring-white/10">
          {[
            { v: 'expense', label: '💸 Dépense' },
            { v: 'income', label: '💰 Revenu' },
          ].map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => set({ type: o.v, categoryId: '' })}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                form.type === o.v
                  ? o.v === 'expense'
                    ? 'bg-red-500/20 text-red-300 ring-1 ring-red-500/30'
                    : 'bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="tx-amount">
              Montant
            </label>
            <input
              id="tx-amount"
              type="text"
              inputMode="decimal"
              className="input"
              placeholder="0,00"
              value={form.amount}
              onChange={(e) => set({ amount: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="tx-date">
              Date
            </label>
            <input
              id="tx-date"
              type="date"
              className="input [color-scheme:dark]"
              value={form.date}
              onChange={(e) => set({ date: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="tx-category">
            Catégorie
          </label>
          <select
            id="tx-category"
            className="input"
            value={form.categoryId}
            onChange={(e) => set({ categoryId: e.target.value })}
          >
            <option value="">— Choisir une catégorie —</option>
            {filteredCats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="tx-desc">
            Description <span className="normal-case text-slate-600">(optionnel)</span>
          </label>
          <input
            id="tx-desc"
            type="text"
            maxLength={200}
            className="input"
            placeholder="Ex : courses de la semaine"
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Annuler
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
