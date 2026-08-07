/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette de marque (tirée de la présentation officielle du projet) —
        // voir DEPLOIEMENT-VPS.md « Système de design ». Ramp séquentiel
        // vert du plus pâle au plus foncé : light → mid → deep → leaf → leaf-deep.
        pomme: {
          cream: '#FBFBF6',
          ink: '#16210F',
          'apple-light': '#C7DE8E',
          'apple-mid': '#8FC24A',
          'apple-deep': '#3B8C47',
          leaf: '#1B4A1E',
          'leaf-deep': '#123512',
          line: '#B9B9B9',
          soft: '#F0F5E7',
        },
        // Statuts — fixes, jamais dérivés de la marque (voir skill dataviz).
        // Toujours accompagnés d'un texte, jamais la couleur seule.
        status: {
          good: '#3B8C47',
          warning: '#D97706',
          critical: '#DC2626',
          neutral: '#6B7280',
        },
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(18,53,18,0.04), 0 8px 20px -12px rgba(18,53,18,0.12)',
        card: '0 4px 12px -4px rgba(18,53,18,0.10), 0 1px 2px rgba(18,53,18,0.04)',
        lifted: '0 16px 34px -14px rgba(59,140,71,0.30)',
      },
    },
  },
  plugins: [],
};
