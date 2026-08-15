/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'Public Sans', 'sans-serif'],
        sans: ['Public Sans', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        paper: {
          DEFAULT: '#E9ECF1',
          soft: '#F3F5F8',
          line: '#D0D5DE',
        },
        ink: {
          DEFAULT: '#141820',
          muted: '#5C6575',
          faint: '#8B93A1',
          950: '#141820',
          900: '#1C2230',
          800: '#2A3344',
          700: '#3D4759',
        },
        mark: {
          DEFAULT: '#0D6E5A',
          soft: '#E3F2EE',
          deep: '#085344',
        },
        signal: {
          green: '#0D6E5A',
          amber: '#B45309',
          red: '#B91C1C',
        },
      },
      boxShadow: {
        panel: '0 1px 0 rgba(20,24,32,0.06)',
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(18px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        rise: 'rise 0.7s ease-out both',
        'rise-delay': 'rise 0.7s ease-out 0.12s both',
        'rise-delay-2': 'rise 0.7s ease-out 0.24s both',
        slideIn: 'slideIn 0.85s ease-out 0.15s both',
      },
    },
  },
  plugins: [],
};
