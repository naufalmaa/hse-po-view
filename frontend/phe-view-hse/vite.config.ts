import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// Demo build only: SafeView title + favicon (prod index.html stays untouched).
const demoBrandHtml = (mode: string): Plugin => ({
  name: 'demo-brand-html',
  transformIndexHtml(html) {
    if (mode !== 'demo') return html;
    return html
      .replace(/<title>.*?<\/title>/, '<title>SafeView</title>')
      .replace(
        '<link rel="shortcut icon" href="/favicon.ico">',
        [
          '<link rel="icon" type="image/svg+xml" href="/brand/safeview/favicon.svg">',
          '<link rel="icon" type="image/png" sizes="32x32" href="/brand/safeview/favicon-32.png">',
          '<link rel="apple-touch-icon" href="/brand/safeview/apple-touch-icon.png">',
        ].join('\n  '),
      );
  },
});

export default defineConfig(({ mode }) => ({
  plugins: [
    demoBrandHtml(mode),
    TanStackRouterVite({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: [
      {
        find: '@',
        replacement: `${path.resolve(__dirname, 'src')}/`,
      },
    ],
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.scss'],
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return id.toString().split('node_modules/')[1].split('/')[0];
          }
        },
      },
    },
  },
  define: {
    '__BUILD_VERSION__': JSON.stringify(
      (() => {
        const now = new Date();
        const yy = now.getFullYear().toString().slice(-1);
        const MM = (now.getMonth() + 1).toString().padStart(2, '0');
        const DD = now.getDate().toString().padStart(2, '0');
        const HH = now.getHours().toString().padStart(2, '0');
        const mm = now.getMinutes().toString().padStart(2, '0');
        return `${yy}.${MM}.${DD}.${HH}${mm}`;
      })()
    ),
  },
}))
