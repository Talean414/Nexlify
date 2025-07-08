/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    '../../shared/frontend/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        red: {
          600: '#DC2626',
          700: '#B91C1C',
          300: '#FCA5A5',
        },
        black: {
          600: '#1F2937',
        },
        platinum: {
          600: '#E5E7EB',
          300: '#F3F4F6',
          100: '#F9FAFB',
        },
        background: '#F9FAFB',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        roboto: ['Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};