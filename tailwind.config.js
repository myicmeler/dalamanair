/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink:      '#0f1419',
        'ink-2':  '#1a1f26',
        paper:    '#faf8f3',
        cream:    '#f5f2ea',
        line:     '#e5e3dd',
        muted:    '#8a8680',
        sub:      '#5a574f',
        accent:   '#f4b942',
        'accent-2': '#e0a528',
        teal:     '#1D9E75',
        amber:    '#EF9F27',
        blue:     '#378ADD',
        border:   '#e5e3dd',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
