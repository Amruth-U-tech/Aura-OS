import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env vars for the current mode so we can use them in the config itself
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],

    // ---------------------------------------------------------------------------
    // Development server
    // ---------------------------------------------------------------------------
    server: {
      port: 5173,
      // Proxy /api/* to the local Express backend so service-worker
      // path-based detection works consistently in dev.
      proxy: {
        '/api': {
          target: env.VITE_API_URL
            ? env.VITE_API_URL.replace('/api', '')
            : 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
      },
    },

    // ---------------------------------------------------------------------------
    // Production build
    // ---------------------------------------------------------------------------
    build: {
      // Vite/Rollup output directory (Vercel picks this up automatically)
      outDir: 'dist',
      // Don't emit source maps in production to reduce bundle size & avoid
      // leaking source code. Enable only for staging if needed.
      sourcemap: mode !== 'production',
      rollupOptions: {
        output: {
          // Split vendor code into a separate chunk for better long-term caching.
          // The app chunk changes on every deploy; the vendor chunk rarely does.
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              // Group large, stable libraries into their own chunks
              if (id.includes('framer-motion')) return 'vendor-framer';
              if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
              return 'vendor';
            }
          },
        },
      },
    },

    // Ensure the public/ directory (service worker, manifest, icons) is
    // copied verbatim into dist/ during build.
    publicDir: 'public',
  };
});
