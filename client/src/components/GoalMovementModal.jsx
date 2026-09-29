import { useEffect, useState } from 'react';
import { api } from '../api';
import Modal from './Modal';
import { formatMoney } from '../utils/format';

/** Modale de versement / retrait sur un objectif d'épargne. */
export default function GoalMovementModal({ open, onClose, onSaved, goal, currency, action, onActionChange }) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount('');
      setError('');
    }
  }, [open, action]);

  if (!goal) return null;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const value = parseFloat(String(amount).replace(',', '.'));
    if (Number.isNaN(value) || value <= 0) {
      setError('Veuillez saisir un montant valide supérieur à 0.');
      return;
    }
    if (action === 'withdraw' && value * 100 > goal.current_amount) {
      setError(`Solde insuffisant sur cet objectif (${formatMoney(goal.current_amount, currency)} disponibles).`);
      return;
    }
    setSaving(true);
    try {
      await api.post(`/api/goals/${goal.id}/movements`, { amount: value, action });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`${goal.icon} ${goal.name}`} maxWidth="max-w-md">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && (
          <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-danger ring-1 ring-red-500/25">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 rounded-xl bg-raised/70 p-1 ring-1 ring-line/10">
          <button
            type="button"
            onClick={() => onActionChange('deposit')}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              action === 'deposit'
                ? 'bg-brand-500/20 text-accent ring-1 ring-brand-500/30'
                : 'text-mute hover:text-strong'
            }`}
          >
            🐷 Verser
          </button>
          <button
            type="button"
            onClick={() => onActionChange('withdraw')}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              action === 'withdraw'
                ? 'bg-red-500/20 text-danger ring-1 ring-red-500/30'
                : 'text-mute hover:text-strong'
            }`}
          >
            🏦 Retirer
          </button>
        </div>

        <p className="text-xs text-faint">
          Épargné : <span className="font-semibold text-strong">{formatMoney(goal.current_amount, currency)}</span>
          {' / '}{formatMoney(goal.target_amount, currency)}
        </p>

        <div>
          <label className="label" htmlFor="mov-amount">Montant</label>
          <input
            id="mov-amount"
            type="text"
            inputMode="decimal"
            className="input"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
          <p className="mt-1.5 text-xs text-faint">
            {action === 'deposit'
              ? '💡 Une dépense « Versement épargne » sera enregistrée dans votre historique.'
              : '💡 Un revenu « Retrait épargne » sera enregistré dans votre historique.'}
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Annuler
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Enregistrement…' : action === 'deposit' ? 'Verser' : 'Retirer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
