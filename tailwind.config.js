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
          // Accent chaud — la « rougeur » d'une pomme, utilisé avec parcimonie
          // (badges vedette, touches décoratives, dégradés hero) pour donner
          // un contrepoint chaud à la palette verte sans jamais remplacer le
          // vert comme couleur d'action principale.
          blush: '#E8604C',
          'blush-deep': '#C3432F',
          'blush-light': '#FBE4DE',
          gold: '#E8A33D',
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
        // Serif chaleureux réservé aux grands titres (hero, nom d'institution,
        // thématique de menu) — jamais pour du texte courant ou des chiffres,
        // voir la classe utilitaire .font-display dans globals.css.
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(18,53,18,0.04), 0 8px 20px -12px rgba(18,53,18,0.12)',
        card: '0 4px 12px -4px rgba(18,53,18,0.10), 0 1px 2px rgba(18,53,18,0.04)',
        lifted: '0 16px 34px -14px rgba(59,140,71,0.30)',
        glow: '0 0 0 1px rgba(59,140,71,0.08), 0 20px 40px -16px rgba(18,53,18,0.22)',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.55s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in': 'fadeIn 0.5s ease-out both',
        'scale-in': 'scaleIn 0.35s cubic-bezier(0.16,1,0.3,1) both',
        'float-slow': 'floatSlow 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
