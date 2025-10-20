/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    '../../shared/frontend/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        platinum: {
          600: '#E5E7EB',
          300: '#F3F4F6',
          100: '#F9FAFB',
        },
        black: {
          600: '#1F2937',
        },
        green: {
          600: '#00FF00',
          500: '#00CC00',
          400: '#00FF99',
        },
        red: {
          600: '#DC2626',
          700: '#B91C1C',
          300: '#FCA5A5',
        },
        background: '#F9FAFB',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        roboto: ['Roboto', 'sans-serif'],
      },
      boxShadow: {
        'custom': '0 10px 20px rgba(0, 255, 0, 0.2)',
      },
      animation: {
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce': 'bounce 0.5s ease-in-out',
      },
    },
  },
  plugins: [],
}
