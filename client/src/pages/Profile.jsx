import { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/format';

const CURRENCIES = [
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'USD', label: 'Dollar américain ($)' },
  { code: 'XOF', label: 'Franc CFA (FCFA)' },
  { code: 'GBP', label: 'Livre sterling (£)' },
  { code: 'CHF', label: 'Franc suisse (CHF)' },
  { code: 'CAD', label: 'Dollar canadien ($)' },
  { code: 'MAD', label: 'Dirham marocain (MAD)' },
];

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currency: user?.currency || 'EUR',
  });
  const [profileError, setProfileError] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwdError, setPwdError] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    if (profile.name.trim().length < 2) {
      setProfileError('Le nom doit contenir au moins 2 caractères.');
      return;
    }
    setProfileSaving(true);
    try {
      const d = await api.patch('/api/users/me', {
        name: profile.name.trim(),
        email: profile.email,
        currency: profile.currency,
      });
      setUser(d.user);
      toast.success('Profil mis à jour.');
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPwdError('');
    if (pwd.newPassword.length < 8) {
      setPwdError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (pwd.newPassword !== pwd.confirm) {
      setPwdError('Les mots de passe ne correspondent pas.');
      return;
    }
    setPwdSaving(true);
    try {
      await api.patch('/api/users/me/password', {
        currentPassword: pwd.currentPassword,
        newPassword: pwd.newPassword,
      });
      setPwd({ currentPassword: '', newPassword: '', confirm: '' });
      toast.success('Mot de passe modifié.');
    } catch (err) {
      setPwdError(err.message);
    } finally {
      setPwdSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-strong">Profil</h1>
        <p className="text-sm text-faint">
          Gérez vos informations personnelles et vos préférences.
        </p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        {/* Informations personnelles */}
        <form onSubmit={saveProfile} className="card space-y-4 p-6" noValidate>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-500/20 text-lg font-bold text-accent">
              {user?.name?.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-strong">{user?.name}</p>
              <p className="text-xs text-faint">
                Membre depuis le {user?.createdAt ? formatDate(user.createdAt.slice(0, 10)) : '—'}
              </p>
            </div>
          </div>

          {profileError && (
            <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-danger ring-1 ring-red-500/25">
              {profileError}
            </div>
          )}

          <div>
            <label className="label" htmlFor="p-name">Nom complet</label>
            <input
              id="p-name"
              className="input"
              value={profile.name}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="label" htmlFor="p-email">Email</label>
            <input
              id="p-email"
              type="email"
              className="input"
              value={profile.email}
              onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
            />
          </div>
          <div>
            <label className="label" htmlFor="p-currency">Devise</label>
            <select
              id="p-currency"
              className="input"
              value={profile.currency}
              onChange={(e) => setProfile((p) => ({ ...p, currency: e.target.value }))}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-faint">
              Utilisée pour l'affichage de tous les montants de l'application.
            </p>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={profileSaving}>
              {profileSaving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>

        {/* Mot de passe */}
        <form onSubmit={savePassword} className="card space-y-4 p-6" noValidate>
          <h2 className="font-semibold text-strong">Changer le mot de passe</h2>

          {pwdError && (
            <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-danger ring-1 ring-red-500/25">
              {pwdError}
            </div>
          )}

          <div>
            <label className="label" htmlFor="pwd-current">Mot de passe actuel</label>
            <input
              id="pwd-current"
              type="password"
              autoComplete="current-password"
              className="input"
              value={pwd.currentPassword}
              onChange={(e) => setPwd((p) => ({ ...p, currentPassword: e.target.value }))}
            />
          </div>
          <div>
            <label className="label" htmlFor="pwd-new">Nouveau mot de passe</label>
            <input
              id="pwd-new"
              type="password"
              autoComplete="new-password"
              className="input"
              placeholder="8 caractères minimum"
              value={pwd.newPassword}
              onChange={(e) => setPwd((p) => ({ ...p, newPassword: e.target.value }))}
            />
          </div>
          <div>
            <label className="label" htmlFor="pwd-confirm">Confirmer le nouveau mot de passe</label>
            <input
              id="pwd-confirm"
              type="password"
              autoComplete="new-password"
              className="input"
              value={pwd.confirm}
              onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))}
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={pwdSaving}>
              {pwdSaving ? 'Modification…' : 'Modifier le mot de passe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
