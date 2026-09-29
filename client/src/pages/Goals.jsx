import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Spinner, EmptyState, ErrorBox } from '../components/Feedback';
import GoalForm from '../components/GoalForm';
import GoalMovementModal from '../components/GoalMovementModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { IconPlus, IconEdit, IconTrash, IconMinus } from '../components/Icons';
import { formatMoney, formatDate } from '../utils/format';

function GoalCard({ goal, currency, onDeposit, onWithdraw, onEdit, onDelete }) {
  const pct = goal.target_amount > 0 ? Math.round((goal.current_amount / goal.target_amount) * 100) : 0;
  const done = goal.current_amount >= goal.target_amount;
  const remaining = goal.target_amount - goal.current_amount;

  return (
    <div className={`card group p-5 ${done ? 'ring-2 !ring-brand-500/40' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
            style={{ backgroundColor: `${goal.color}22`, color: goal.color }}
          >
            {goal.icon}
          </span>
          <div>
            <p className="font-semibold text-strong">
              {goal.name} {done && '🎉'}
            </p>
            <p className="text-xs text-faint">
              {done
                ? 'Objectif atteint, bravo !'
                : `Encore ${formatMoney(remaining, currency)} à épargner`}
              {goal.deadline ? ` · pour le ${formatDate(goal.deadline)}` : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
          <button className="rounded-lg p-2 text-faint hover:bg-raised2 hover:text-strong" onClick={() => onEdit(goal)} title="Modifier">
            <IconEdit />
          </button>
          <button className="rounded-lg p-2 text-faint hover:bg-red-500/10 hover:text-danger" onClick={() => onDelete(goal)} title="Supprimer">
            <IconTrash />
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-baseline justify-between text-sm">
          <span className="font-bold text-strong">{formatMoney(goal.current_amount, currency)}</span>
          <span className="text-xs text-faint">
            {pct}% de {formatMoney(goal.target_amount, currency)}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-raised">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(100, pct)}%`, backgroundColor: goal.color }}
          />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button className="btn-primary flex-1 !py-2 text-xs" onClick={() => onDeposit(goal)}>
          <IconPlus size={14} /> Verser
        </button>
        <button
          className="btn-secondary flex-1 !py-2 text-xs"
          onClick={() => onWithdraw(goal)}
          disabled={goal.current_amount <= 0}
        >
          <IconMinus size={14} /> Retirer
        </button>
      </div>
    </div>
  );
}

export default function Goals() {
  const { user } = useAuth();
  const currency = user?.currency || 'EUR';
  const toast = useToast();

  const [goals, setGoals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [movement, setMovement] = useState({ goal: null, action: 'deposit' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await api.get('/api/goals');
      setGoals(d.goals);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openMovement = (goal, action) => setMovement({ goal, action });

  const totalSaved = (goals || []).reduce((s, g) => s + g.current_amount, 0);
  const totalTarget = (goals || []).reduce((s, g) => s + g.target_amount, 0);

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await api.del(`/api/goals/${deleting.id}`);
      toast.success('Objectif supprimé (les mouvements déjà enregistrés sont conservés).');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-strong">Objectifs d'épargne</h1>
          <p className="text-sm text-faint">
            Mettez de côté pour vos projets — chaque versement est tracé dans votre historique.
          </p>
        </div>
        <button className="btn-primary" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <IconPlus size={16} /> Nouvel objectif
        </button>
      </div>

      {goals && goals.length > 0 && (
        <div className="card flex flex-wrap items-center gap-6 p-5">
          <div>
            <p className="text-xs text-faint">Épargne totale</p>
            <p className="text-xl font-bold text-accent">{formatMoney(totalSaved, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-faint">Objectifs cumulés</p>
            <p className="text-xl font-bold text-strong">{formatMoney(totalTarget, currency)}</p>
          </div>
          <div className="min-w-44 flex-1">
            <div className="h-2.5 overflow-hidden rounded-full bg-raised">
              <div
                className="h-full rounded-full bg-brand-500 transition-all"
                style={{
                  width: `${totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0}%`,
                }}
              />
            </div>
            <p className="mt-1.5 text-xs text-faint">
              {totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0}% de l'objectif global
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <Spinner label="Chargement des objectifs…" />
      ) : error ? (
        <ErrorBox message={error} onRetry={load} />
      ) : !goals || goals.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="🐷"
            title="Aucun objectif d'épargne"
            message="Créez un objectif (vacances, fonds d'urgence, nouveau PC…) et suivez votre progression mois après mois."
            action={
              <button className="btn-primary" onClick={() => { setEditing(null); setFormOpen(true); }}>
                <IconPlus size={16} /> Créer un objectif
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {goals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              currency={currency}
              onDeposit={(goal) => openMovement(goal, 'deposit')}
              onWithdraw={(goal) => openMovement(goal, 'withdraw')}
              onEdit={(goal) => { setEditing(goal); setFormOpen(true); }}
              onDelete={setDeleting}
            />
          ))}
        </div>
      )}

      <GoalForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => { toast.success(editing ? 'Objectif modifié.' : 'Objectif créé.'); load(); }}
        initial={editing}
      />
      <GoalMovementModal
        open={Boolean(movement.goal)}
        onClose={() => setMovement({ goal: null, action: 'deposit' })}
        onSaved={() => {
          toast.success(movement.action === 'deposit' ? 'Versement enregistré. Bravo ! 🎉' : 'Retrait enregistré.');
          load();
        }}
        goal={movement.goal}
        currency={currency}
        action={movement.action}
        onActionChange={(action) => setMovement((m) => ({ ...m, action }))}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteLoading}
        title="Supprimer l'objectif"
        message={`« ${deleting?.name} » sera supprimé. Les versements déjà enregistrés resteront dans votre historique.`}
      />
    </div>
  );
}
