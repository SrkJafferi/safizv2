/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#fdf2f2',
          100: '#fce8e7',
          200: '#f8c5c3',
          300: '#f29a97',
          400: '#ea6a66',
          500: '#e13f39',
          600: '#cf241e',   // 👈 YOUR MAIN BRAND COLOR
          700: '#000000',
          800: '#8f1814',
          900: '#66100e',
        },
      },
    },
  },
  plugins: [],
};