export function Spinner({ label = 'Chargement…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-14 text-slate-400">
      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ icon = '📭', title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <span className="text-4xl">{icon}</span>
      <p className="font-semibold text-slate-300">{title}</p>
      {message && <p className="max-w-sm text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="card flex flex-col items-center gap-3 p-8 text-center">
      <span className="text-3xl">⚠️</span>
      <p className="text-sm text-red-300">{message}</p>
      {onRetry && (
        <button className="btn-secondary" onClick={onRetry}>
          Réessayer
        </button>
      )}
    </div>
  );
}
