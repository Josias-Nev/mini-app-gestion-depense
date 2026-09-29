import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import Modal from './Modal';
import { todayISO, FREQUENCY_LABELS } from '../utils/format';

const EMPTY = {
  type: 'expense',
  amount: '',
  categoryId: '',
  frequency: 'monthly',
  start_date: todayISO(),
  description: '',
};

/**
 * Formulaire de création / modification d'une règle récurrente.
 * En édition : seuls montant, description, fréquence et prochaine échéance
 * sont modifiables (le type et la catégorie sont figés pour rester cohérent).
 */
export default function RecurringForm({ open, onClose, onSaved, categories, initial }) {
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
        frequency: initial.frequency,
        start_date: initial.nextRunDate,
        description: initial.description || '',
      });
    } else {
      setForm({ ...EMPTY, start_date: todayISO() });
    }
  }, [open, initial]);

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
    if (!form.start_date) {
      setError('Veuillez choisir une date.');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await api.patch(`/api/recurring/${initial.id}`, {
          amount,
          frequency: form.frequency,
          next_run_date: form.start_date,
          description: form.description.trim(),
        });
      } else {
        await api.post('/api/recurring', {
          type: form.type,
          amount,
          categoryId: Number(form.categoryId),
          frequency: form.frequency,
          start_date: form.start_date,
          description: form.description.trim(),
        });
      }
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
      title={isEdit ? 'Modifier la récurrence' : 'Nouvelle transaction récurrente'}
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && (
          <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-danger ring-1 ring-red-500/25">
            {error}
          </div>
        )}

        {!isEdit && (
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-raised/70 p-1 ring-1 ring-line/10">
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
                      ? 'bg-red-500/20 text-danger ring-1 ring-red-500/30'
                      : 'bg-brand-500/20 text-accent ring-1 ring-brand-500/30'
                    : 'text-mute hover:text-strong'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="rec-amount">Montant</label>
            <input
              id="rec-amount"
              type="text"
              inputMode="decimal"
              className="input"
              placeholder="0,00"
              value={form.amount}
              onChange={(e) => set({ amount: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="rec-freq">Fréquence</label>
            <select
              id="rec-freq"
              className="input"
              value={form.frequency}
              onChange={(e) => set({ frequency: e.target.value })}
            >
              {Object.entries(FREQUENCY_LABELS).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="rec-cat">Catégorie</label>
            <select
              id="rec-cat"
              className="input"
              value={form.categoryId}
              disabled={isEdit}
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
            <label className="label" htmlFor="rec-date">
              {isEdit ? 'Prochaine échéance' : 'Date de début'}
            </label>
            <input
              id="rec-date"
              type="date"
              className="input"
              value={form.start_date}
              onChange={(e) => set({ start_date: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="rec-desc">
            Description <span className="normal-case text-faint">(optionnel)</span>
          </label>
          <input
            id="rec-desc"
            type="text"
            maxLength={200}
            className="input"
            placeholder="Ex : loyer, salaire, Netflix…"
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
          />
        </div>

        {!isEdit && (
          <p className="rounded-xl bg-raised/60 px-4 py-3 text-xs text-faint ring-1 ring-line/5">
            💡 Les échéances déjà passées sont générées immédiatement ; les suivantes le seront
            automatiquement à leur date.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Annuler
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer la récurrence'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
