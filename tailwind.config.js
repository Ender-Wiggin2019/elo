/** @type {import('tailwindcss').Config} */
module.exports = {
  // prefix: 'tw-',
  important: true,
  content: [
    './assets/index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
};

