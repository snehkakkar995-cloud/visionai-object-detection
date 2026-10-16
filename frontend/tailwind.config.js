/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#070d1c',
          900: '#0a1226',
          800: '#0f1b36',
          700: '#162649',
          600: '#1f3363',
        },
        brand: { 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', cyan: '#22d3ee' },
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'] },
      boxShadow: { glow: '0 0 40px -10px rgba(59,130,246,0.45)' },
    },
  },
  plugins: [],
};
