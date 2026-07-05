/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf4f5',
          100: '#fbe8eb',
          200: '#f7d5d9',
          300: '#f1b4bc',
          400: '#e78b97',
          500: '#da5f70',
          600: '#c54255',
          700: '#a53142',
          800: '#892c3a',
          900: '#722934',
          950: '#3f1218',
        },
        slate: {
          950: '#0b0f19',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
