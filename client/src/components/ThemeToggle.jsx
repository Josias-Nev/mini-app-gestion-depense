import { useState } from 'react';
import { getTheme, toggleTheme } from '../theme';
import { IconSun, IconMoon } from './Icons';

export default function ThemeToggle({ labeled = false }) {
  const [theme, setTheme] = useState(getTheme());
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(toggleTheme())}
      title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      className={`rounded-lg p-2 text-faint transition hover:bg-raised2 hover:text-strong ${
        labeled ? 'flex items-center gap-2 !py-2.5 text-sm' : ''
      }`}
    >
      {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
      {labeled && (isDark ? 'Mode clair' : 'Mode sombre')}
    </button>
  );
}
