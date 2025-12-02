/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'genomic-teal': '#34D399',
        'genomic-blue': '#8B5CF6',
        'genomic-dark': '#14102E',
        'genomic-cyan': '#F472B6',
        'genomic-bg': '#0B0B1D',
        // Dark mode colors
        dark: {
          primary: '#8B5CF6',
          secondary: '#34D399',
          background: '#0F172A',
          surface: '#1E293B',
          text: '#F8FAFC',
          'text-secondary': '#94A3B8',
        },
        // Light mode colors
        light: {
          primary: '#7C3AED',
          secondary: '#10B981',
          background: '#F8FAFC',
          surface: '#FFFFFF',
          text: '#1E293B',
          'text-secondary': '#64748B',
        },
      },
      animation: {
        'dna-spin': 'spin 20s linear infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
