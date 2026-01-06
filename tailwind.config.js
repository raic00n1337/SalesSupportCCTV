/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f0ff',
          100: '#ebe5ff',
          200: '#d9ccff',
          300: '#c3adff',
          400: '#ad8dff',
          500: '#8D5FFF',
          600: '#7a4ddb',
          700: '#673bb7',
          800: '#542a93',
          900: '#41196f',
        },
        'ci-light': '#D7D8D6',
        'ci-accent': '#C2B4FC',
      },
    },
  },
  plugins: [],
}



