/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class', // Manual toggling
  theme: {
    extend: {
      colors: {
        bg: { primary: 'var(--bg-primary)', secondary: 'var(--bg-secondary)', card: 'var(--bg-card)' },
        txt: { primary: 'var(--text-primary)', secondary: 'var(--text-secondary)' },
        border: 'var(--border-color)',
        brand: { DEFAULT: 'var(--accent)', light: 'var(--accent-light)' }
      }
    },
  },
  plugins: [],
}
