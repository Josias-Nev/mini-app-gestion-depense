import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/AuthShell';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.name.trim().length < 2) {
      setError('Le nom doit contenir au moins 2 caractères.');
      return;
    }
    if (form.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      await register(form.name.trim(), form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Créer un compte 🚀"
      subtitle="Quelques secondes suffisent pour démarrer."
      footer={
        <>
          Déjà inscrit ?{' '}
          <Link to="/login" className="font-semibold text-brand-400 hover:text-brand-300">
            Se connecter
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && (
          <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/25">
            {error}
          </div>
        )}
        <div>
          <label className="label" htmlFor="name">Nom complet</label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            className="input"
            placeholder="Jean Dupont"
            value={form.name}
            onChange={onChange}
          />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className="input"
            placeholder="vous@exemple.fr"
            value={form.email}
            onChange={onChange}
          />
        </div>
        <div>
          <label className="label" htmlFor="password">Mot de passe</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            className="input"
            placeholder="8 caractères minimum"
            value={form.password}
            onChange={onChange}
          />
        </div>
        <div>
          <label className="label" htmlFor="confirm">Confirmer le mot de passe</label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            className="input"
            placeholder="••••••••"
            value={form.confirm}
            onChange={onChange}
          />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Création du compte…' : "Créer mon compte"}
        </button>
      </form>
    </AuthShell>
  );
}
