/** @type {import('tailwindcss').Config} */
export default {
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
