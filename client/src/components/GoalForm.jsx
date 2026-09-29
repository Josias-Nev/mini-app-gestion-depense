import { useEffect, useState } from 'react';
import { api } from '../api';
import Modal from './Modal';

const GOAL_EMOJIS = ['🎯', '🏖️', '🚗', '🏠', '💻', '📱', '✈️', '💍', '🎓', '🚲', '🛡️', '🎸', '🐶', '👶', '💰', '🛥️'];
const GOAL_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#0ea5e9', '#f97316', '#14b8a6'];

const EMPTY = { name: '', target: '', deadline: '', icon: '🎯', color: GOAL_COLORS[0] };

export default function GoalForm({ open, onClose, onSaved, initial }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initial);

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(
      initial
        ? {
            name: initial.name,
            target: (initial.target_amount / 100).toString(),
            deadline: initial.deadline || '',
            icon: initial.icon,
            color: initial.color,
          }
        : EMPTY
    );
  }, [open, initial]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const target = parseFloat(String(form.target).replace(',', '.'));
    if (!form.name.trim()) {
      setError('Le nom de l\u2019objectif est requis.');
      return;
    }
    if (Number.isNaN(target) || target <= 0) {
      setError('Veuillez saisir un montant cible valide.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        target,
        deadline: form.deadline || null,
        icon: form.icon,
        color: form.color,
      };
      if (isEdit) await api.patch(`/api/goals/${initial.id}`, payload);
      else await api.post('/api/goals', payload);
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Modifier l'objectif" : 'Nouvel objectif d\u2019épargne'}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && (
          <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-danger ring-1 ring-red-500/25">
            {error}
          </div>
        )}

        <div>
          <label className="label" htmlFor="goal-name">Nom de l'objectif</label>
          <input
            id="goal-name"
            className="input"
            maxLength={60}
            placeholder="Ex : Vacances, Nouveau PC, Fonds d'urgence…"
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="goal-target">Montant cible</label>
            <input
              id="goal-target"
              type="text"
              inputMode="decimal"
              className="input"
              placeholder="0,00"
              value={form.target}
              onChange={(e) => set({ target: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="goal-deadline">
              Échéance <span className="normal-case text-faint">(optionnel)</span>
            </label>
            <input
              id="goal-deadline"
              type="date"
              className="input"
              value={form.deadline}
              onChange={(e) => set({ deadline: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="label">Icône</label>
          <div className="grid grid-cols-8 gap-1.5 rounded-xl bg-raised/60 p-2 ring-1 ring-line/10">
            {GOAL_EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => set({ icon: em })}
                className={`rounded-lg p-1.5 text-lg transition hover:bg-raised2 ${
                  form.icon === em ? 'bg-brand-500/25 ring-1 ring-brand-500/40' : ''
                }`}
              >
                {em}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Couleur</label>
          <div className="flex flex-wrap gap-2">
            {GOAL_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set({ color: c })}
                className={`h-8 w-8 rounded-full transition ${
                  form.color === c ? 'ring-2 ring-line ring-offset-2 ring-offset-surface' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Couleur ${c}`}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Annuler
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
