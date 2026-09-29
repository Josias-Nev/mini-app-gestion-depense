import { useEffect, useState } from 'react';
import { api } from '../api';
import Modal from './Modal';

const EMOJIS = [
  '🛒', '🍽️', '🏠', '🚗', '💊', '🎮', '🛍️', '📱', '📚', '🧾', '📦', '✈️',
  '🐾', '👶', '💇', '🎁', '⚽', '🎬', '☕', '💡', '💼', '💻', '↩️', '📈', '💰', '🏦', '🪙',
];

const COLORS = [
  '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899', '#14b8a6',
  '#f97316', '#6366f1', '#10b981', '#22c55e', '#0ea5e9', '#64748b',
  '#d946ef', '#84cc16', '#eab308', '#94a3b8',
];

const EMPTY = { name: '', type: 'expense', color: COLORS[8], icon: '📦' };

export default function CategoryForm({ open, onClose, onSaved, initial }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initial);

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(
      initial
        ? { name: initial.name, type: initial.type, color: initial.color, icon: initial.icon }
        : EMPTY
    );
  }, [open, initial]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('Le nom de la catégorie est requis.');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) await api.patch(`/api/categories/${initial.id}`, form);
      else await api.post('/api/categories', form);
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Modifier la catégorie' : 'Nouvelle catégorie'}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && (
          <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/25">
            {error}
          </div>
        )}

        <div>
          <label className="label" htmlFor="cat-name">Nom</label>
          <input
            id="cat-name"
            className="input"
            maxLength={50}
            placeholder="Ex : Sport, Impôts…"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>

        <div>
          <label className="label">Type</label>
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-800/70 p-1 ring-1 ring-white/10">
            {[
              { v: 'expense', label: '💸 Dépense' },
              { v: 'income', label: '💰 Revenu' },
            ].map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setForm((f) => ({ ...f, type: o.v }))}
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
        </div>

        <div>
          <label className="label">Icône</label>
          <div className="grid max-h-36 grid-cols-8 gap-1.5 overflow-y-auto rounded-xl bg-slate-800/60 p-2 ring-1 ring-white/10 sm:grid-cols-12">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setForm((f) => ({ ...f, icon: e }))}
                className={`rounded-lg p-1.5 text-lg transition hover:bg-slate-700 ${
                  form.icon === e ? 'bg-brand-500/25 ring-1 ring-brand-500/40' : ''
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Couleur</label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm((f) => ({ ...f, color: c }))}
                className={`h-8 w-8 rounded-full transition ${
                  form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Couleur ${c}`}
              />
            ))}
          </div>
        </div>

        {/* Aperçu */}
        <div className="flex items-center gap-3 rounded-xl bg-slate-800/60 p-3 ring-1 ring-white/10">
          <span className="text-xs text-slate-500">Aperçu :</span>
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl text-lg"
            style={{ backgroundColor: `${form.color}22`, color: form.color }}
          >
            {form.icon}
          </span>
          <span className="text-sm font-medium text-slate-200">{form.name || 'Ma catégorie'}</span>
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
