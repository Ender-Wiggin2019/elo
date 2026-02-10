import {defineConfig} from 'vite';
import vue2 from '@vitejs/plugin-vue2';
import {createHtmlPlugin} from 'vite-plugin-html';
import * as path from 'path';

const VERSION = new Date().toISOString().substr(5, 5).replace('-', '') +
  (Math.floor(Math.random() * 1e4)).toString();

export default defineConfig({
  plugins: [
    vue2({
      // Don't transform asset URLs in templates — they're runtime paths served by the Node backend
      template: {
        transformAssetUrls: false,
      },
    }),
    createHtmlPlugin({
      minify: false,
      inject: {
        data: {
          VERSION,
        },
      },
    }),
  ],

  resolve: {
    alias: {
      // @/* path alias (mirrors tsconfig paths)
      '@': path.resolve(__dirname, 'src'),
      // Vue 2.7 still needs the full ESM build for runtime template compilation
      'vue': 'vue/dist/vue.esm.js',
    },
    extensions: ['.ts', '.vue', '.js', '.json'],
  },

  // No publicDir — the Node server handles static assets; in dev we proxy
  publicDir: false,

  css: {
    preprocessorOptions: {
      less: {
        // Support @import (inline) used in common.less
        math: 'always',
      },
    },
  },

  define: {
    // Inject the version string so it can be used at runtime if needed
    '__APP_VERSION__': JSON.stringify(VERSION),
  },

  build: {
    outDir: 'build',
    emptyOutDir: false, // Don't wipe build/ (it also contains server build, styles.css, etc.)
    sourcemap: true,

    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
      output: {
        // Match the existing convention: build/main.js (no hash)
        entryFileNames: 'main.js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'css/[name]-[hash][extname]',
      },
    },
  },

  server: {
    port: 5173,
    proxy: {
      // Only proxy API endpoints and static assets to the backend.
      // All client-side page routes (/, /login, /player, /lobby, etc.)
      // are handled by Vite's SPA fallback (serves index.html).
      '/api': 'http://localhost:8081',
      '/favicon.ico': 'http://localhost:8081',
      // Static assets built by the server (CSS, fonts, images, locales)
      '/styles.css': 'http://localhost:8081',
      '/tailwindcss.css': 'http://localhost:8081',
      '/assets': 'http://localhost:8081',
    },
  },
});
