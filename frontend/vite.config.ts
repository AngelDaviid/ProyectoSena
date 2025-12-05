import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_SENA_API_URL || 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
        // ✅ Proxy para Socket.io
        '/socket. io': {
          target: env.VITE_SENA_API_URL || 'http://localhost:3001',
          ws: true,
          changeOrigin: true,
        },
      },
    },
    define: {
      'import.meta.env.VITE_SENA_API_URL': JSON.stringify(
          env.VITE_SENA_API_URL ||
          (mode === 'production'
              ? 'https://proyectosena-gkx1.onrender.com'
              : 'http://localhost:3001')
      ),
    },
  };
});