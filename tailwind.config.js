/** @type {import('tailwindcss').Config} */
module.exports = {
  // prefix: 'tw-',
  important: true,
  content: [
    './assets/index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        mars: {
          void: '#0b0f1a',
          deep: '#182136',
          surface: '#1f2b44',
          border: '#2e3f5e',
          rust: '#c2410c',
          amber: '#d97706',
          ember: '#ea580c',
          sand: '#a3764f',
          cyan: '#06b6d4',
          teal: '#14b8a6',
          red: '#dc2626',
          yellow: '#eab308',
          text: '#e2e8f0',
          'text-dim': '#94a3b8',
          'text-faint': '#64748b',
        },
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false, // 如果存在样式冲突选择原来自带的样式
  },
};

