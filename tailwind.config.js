/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom game colors
        'board': {
          'dark': '#0d9488',
          'light': '#14b8a6',
          'border': '#0f766e',
        },
        'piece': {
          'black': '#1e293b',
          'white': '#f8fafc',
        }
      },
      fontFamily: {
        sans: ['Roboto', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'piece-place': 'piecePlace 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'piece-flip': 'pieceFlip 0.4s ease-in-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-hint': 'pulseHint 1.5s ease-in-out infinite',
      },
      keyframes: {
        piecePlace: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pieceFlip: {
          '0%': { transform: 'rotateY(0deg)' },
          '50%': { transform: 'rotateY(90deg)' },
          '100%': { transform: 'rotateY(0deg)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseHint: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
      },
    },
  },
  plugins: [],
  // Important: Prefix Tailwind classes to avoid conflicts with Angular Material
  important: true,
}
