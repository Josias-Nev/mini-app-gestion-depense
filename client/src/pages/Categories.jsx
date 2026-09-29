import { useState } from 'react';
import { api } from '../api';
import { useCategories } from '../hooks/useCategories';
import { useToast } from '../context/ToastContext';
import { Spinner, EmptyState, ErrorBox } from '../components/Feedback';
import CategoryForm from '../components/CategoryForm';
import ConfirmDialog from '../components/ConfirmDialog';
import { IconPlus, IconEdit, IconTrash } from '../components/Icons';

function CategorySection({ title, icon, items, onEdit, onDelete }) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 font-semibold text-slate-200">
        <span>{icon}</span> {title}
        <span className="text-xs font-normal text-slate-500">({items.length})</span>
      </h2>
      {items.length === 0 ? (
        <div className="card p-4 text-sm text-slate-500">Aucune catégorie.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <div key={c.id} className="card group flex items-center gap-3 p-4">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
                style={{ backgroundColor: `${c.color}22`, color: c.color }}
              >
                {c.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-200">{c.name}</p>
                <p className="text-xs text-slate-500">
                  {c.transactionCount} transaction{c.transactionCount > 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                <button
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-slate-200"
                  onClick={() => onEdit(c)}
                  title="Modifier"
                >
                  <IconEdit />
                </button>
                <button
                  className="rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                  onClick={() => onDelete(c)}
                  title="Supprimer"
                >
                  <IconTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function Categories() {
  const { categories, loading, error, reload } = useCategories();
  const toast = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (c) => {
    setEditing(c);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await api.del(`/api/categories/${deleting.id}`);
      toast.success('Catégorie supprimée.');
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(err.message);
      setDeleting(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) return <Spinner label="Chargement des catégories…" />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const expenses = categories.filter((c) => c.type === 'expense');
  const incomes = categories.filter((c) => c.type === 'income');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Catégories</h1>
          <p className="text-sm text-slate-500">
            Organisez vos opérations avec des catégories personnalisées.
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <IconPlus size={16} /> Nouvelle catégorie
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="🏷️"
            title="Aucune catégorie"
            message="Créez votre première catégorie pour classer vos transactions."
            action={
              <button className="btn-primary" onClick={openCreate}>
                <IconPlus size={16} /> Créer une catégorie
              </button>
            }
          />
        </div>
      ) : (
        <>
          <CategorySection title="Dépenses" icon="💸" items={expenses} onEdit={openEdit} onDelete={setDeleting} />
          <CategorySection title="Revenus" icon="💰" items={incomes} onEdit={openEdit} onDelete={setDeleting} />
        </>
      )}

      <CategoryForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => { toast.success(editing ? 'Catégorie modifiée.' : 'Catégorie créée.'); reload(); }}
        initial={editing}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteLoading}
        title="Supprimer la catégorie"
        message={`La catégorie « ${deleting?.name} » sera définitivement supprimée. Elle doit d'abord n'être utilisée par aucune transaction ni aucun budget.`}
      />
    </div>
  );
}
