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
} from './Icons';
import { useToast } from '../context/ToastContext';

const NAV = [
  { to: '/', label: 'Tableau de bord', icon: IconDashboard, end: true },
  { to: '/transactions', label: 'Transactions', icon: IconList },
  { to: '/categories', label: 'Catégories', icon: IconTag },
  { to: '/budgets', label: 'Budgets', icon: IconWallet },
  { to: '/stats', label: 'Statistiques', icon: IconChart },
  { to: '/profile', label: 'Profil', icon: IconUser },
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
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/5 bg-slate-950/80 px-4 py-6 backdrop-blur md:flex">
        <div className="mb-8 flex items-center gap-3 px-2">
          <Logo />
          <div>
            <p className="text-lg font-bold leading-tight text-slate-100">MonBudget</p>
            <p className="text-xs text-slate-500">Gérez vos finances</p>
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
                    ? 'bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/25'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`
              }
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-4 border-t border-white/5 pt-4">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-sm font-bold text-brand-300">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-200">{user?.name}</p>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Se déconnecter"
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-800 hover:text-red-300"
            >
              <IconLogout size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Barre du bas (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-white/10 bg-slate-950/90 py-2 backdrop-blur md:hidden">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={label}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] ${
                isActive ? 'text-brand-300' : 'text-slate-500'
              }`
            }
          >
            <Icon size={20} />
            {label.split(' ')[0]}
          </NavLink>
        ))}
      </nav>

      {/* Contenu */}
      <main className="flex-1 px-4 pb-24 pt-6 sm:px-6 md:ml-64 md:pb-10 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
