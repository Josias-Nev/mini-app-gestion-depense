/** Couleur pilotée par variable CSS (canaux RGB) pour supporter les deux thèmes. */
const themed = (name) => `rgb(var(${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter', 'ui-sans-serif', 'system-ui', '-apple-system',
          'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif',
        ],
      },
      colors: {
        // Tokens sémantiques — valeurs dans src/index.css selon data-theme
        base: themed('--c-bg'), // fond de page
        surface: themed('--c-surface'), // cartes, modales
        raised: themed('--c-raised'), // champs, zones surélevées
        raised2: themed('--c-raised2'), // survols
        strong: themed('--c-strong'), // texte principal
        mute: themed('--c-mute'), // texte secondaire
        faint: themed('--c-faint'), // texte discret / placeholders
        line: themed('--c-line'), // bordures (avec opacité)
        accent: themed('--c-accent'), // texte vert (liens, montants +)
        danger: themed('--c-danger'), // texte rouge (montants −)
        warning: themed('--c-warning'), // texte ambre
        info: themed('--c-info'), // texte bleu
        brand: {
          50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7',
          400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857',
          800: '#065f46', 900: '#064e3b', 950: '#022c22',
        },
      },
      animation: {
        'fade-in': 'fadeIn .25s ease-out',
        'slide-up': 'slideUp .3s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
