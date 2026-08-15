/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'Segoe UI', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          950: '#07090d',
          900: '#0c1017',
          800: '#141b24',
          700: '#1c2633',
        },
        signal: {
          green: '#3dd68c',
          amber: '#e7b549',
          red: '#f07178',
        },
      },
    },
  },
  plugins: [],
};
