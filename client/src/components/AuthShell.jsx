import { Logo } from './Icons';

/** Structure visuelle commune aux pages Connexion / Inscription. */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl ring-1 ring-line/10 md:grid-cols-2">
        {/* Panneau de marque */}
        <div className="hidden flex-col justify-between bg-gradient-to-br from-brand-600 via-brand-700 to-slate-900 p-10 md:flex">
          <div className="flex items-center gap-3">
            <Logo size={40} />
            <span className="text-xl font-bold text-white">MonBudget</span>
          </div>
          <div>
            <h2 className="text-3xl font-bold leading-snug text-white">
              Reprenez le contrôle de votre argent.
            </h2>
            <p className="mt-3 text-sm text-brand-100/90">
              Suivez vos revenus et dépenses, fixez des budgets par catégorie et
              visualisez vos habitudes grâce à des statistiques claires.
            </p>
          </div>
          <ul className="space-y-2 text-sm text-brand-100/90">
            <li className="flex items-center gap-2"><span>📊</span> Statistiques détaillées</li>
            <li className="flex items-center gap-2"><span>🎯</span> Budgets par catégorie</li>
            <li className="flex items-center gap-2"><span>🔒</span> Données privées et sécurisées</li>
          </ul>
        </div>

        {/* Formulaire */}
        <div className="card rounded-none p-8 sm:p-10">
          <div className="mb-8 flex items-center gap-3 md:hidden">
            <Logo size={36} />
            <span className="text-lg font-bold text-strong">MonBudget</span>
          </div>
          <h1 className="text-2xl font-bold text-strong">{title}</h1>
          <p className="mb-8 mt-1 text-sm text-faint">{subtitle}</p>
          {children}
          {footer && <p className="mt-6 text-center text-sm text-faint">{footer}</p>}
        </div>
      </div>
    </div>
  );
}
