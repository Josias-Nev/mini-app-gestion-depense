import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Logo,
  IconDashboard,
  IconList,
  IconTag,
  IconWallet,
  IconChart,
  IconUser,
  IconLogout,
  IconRepeat,
  IconTarget,
} from './Icons';
import { useToast } from '../context/ToastContext';
import ThemeToggle from './ThemeToggle';

const NAV = [
  { to: '/', label: 'Tableau de bord', short: 'Tableau', icon: IconDashboard, end: true },
  { to: '/transactions', label: 'Transactions', short: 'Opérat.', icon: IconList },
  { to: '/recurring', label: 'Récurrences', short: 'Récurr.', icon: IconRepeat },
  { to: '/categories', label: 'Catégories', short: 'Catég.', icon: IconTag },
  { to: '/budgets', label: 'Budgets', short: 'Budgets', icon: IconWallet },
  { to: '/goals', label: 'Épargne', short: 'Épargne', icon: IconTarget },
  { to: '/stats', label: 'Statistiques', short: 'Stats', icon: IconChart },
  { to: '/profile', label: 'Profil', short: 'Profil', icon: IconUser },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Vous êtes déconnecté.');
    navigate('/login');
  };

  const initials = user?.name
    ?.split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar (desktop) */}
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line/5 bg-base/80 px-4 py-6 backdrop-blur md:flex">
        <div className="mb-8 flex items-center gap-3 px-2">
          <Logo />
          <div>
            <p className="text-lg font-bold leading-tight text-strong">MonBudget</p>
            <p className="text-xs text-faint">Gérez vos finances</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-500/15 text-accent ring-1 ring-brand-500/25'
                    : 'text-mute hover:bg-raised/60 hover:text-strong'
                }`
              }
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-4 border-t border-line/5 pt-4">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-sm font-bold text-accent">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-strong">{user?.name}</p>
              <p className="truncate text-xs text-faint">{user?.email}</p>
            </div>
            <ThemeToggle />
            <button
              onClick={handleLogout}
              title="Se déconnecter"
              className="rounded-lg p-2 text-faint transition hover:bg-raised2 hover:text-danger"
            >
              <IconLogout size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Barre du haut (mobile) */}
      <header className="no-print fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-line/10 bg-base/90 px-4 py-2.5 backdrop-blur md:hidden">
        <div className="flex items-center gap-2.5">
          <Logo size={28} />
          <span className="font-bold text-strong">MonBudget</span>
        </div>
        <ThemeToggle />
      </header>

      {/* Barre du bas (mobile) */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-line/10 bg-base/90 px-1 py-2 backdrop-blur md:hidden">
        {NAV.map(({ to, label, short, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={label}
            className={({ isActive }) =>
              `flex min-w-0 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[9px] ${
                isActive ? 'text-accent' : 'text-faint'
              }`
            }
          >
            <Icon size={20} />
            <span className="truncate">{short}</span>
          </NavLink>
        ))}
      </nav>

      {/* Contenu */}
      <main className="flex-1 px-4 pb-24 pt-16 print:!m-0 print:!p-6 sm:px-6 md:ml-64 md:pb-10 md:pt-6 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
