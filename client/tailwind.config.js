/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        climate: {
          50: '#f0f7f7',
          100: '#e0efef',
          500: '#2c7a7b',
          600: '#236061',
          700: '#1b4a4b',
          900: '#0f2b2c',
        }
      }
    },
  },
  plugins: [],
}
