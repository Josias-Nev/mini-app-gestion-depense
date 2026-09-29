import Modal from './Modal';

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Supprimer', onConfirm, onClose, loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-sm">
      <p className="text-sm text-mute">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose} disabled={loading}>
          Annuler
        </button>
        <button className="btn-danger" onClick={onConfirm} disabled={loading}>
          {loading ? 'Suppression…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
