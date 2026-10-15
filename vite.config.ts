import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), {
      name: 'agrodecide-assistant-api',
      configureServer(server) {
        server.middlewares.use('/api/assistant', async (req, res, next) => {
          try { const api = await server.ssrLoadModule('/api/assistant.ts'); await api.default(req, res); }
          catch { res.statusCode = 500; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({error:'Servicio no disponible'})); }
        });
      },
    }],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              { name: 'react-vendor', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 20 },
              { name: 'charts', test: /node_modules[\\/](recharts|recharts-scale|d3-[^\\/]+|victory-vendor)[\\/]/, priority: 15 },
            ],
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : { ignored: ['**/data/v4/**', '**/archive/**', '**/.venv/**'] },
    },
  };
});
