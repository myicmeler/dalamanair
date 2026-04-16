/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink:    '#0e0e0c',
        paper:  '#f0ede6',
        muted:  'rgba(240,237,230,0.4)',
        border: 'rgba(240,237,230,0.1)',
        teal:   '#5dcaa5',
        amber:  '#ef9f27',
        blue:   '#85b7eb',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
