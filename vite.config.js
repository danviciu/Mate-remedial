import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    base: '/Mate-remedial/',
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target: env.AI_PROXY_TARGET || "http://localhost:8787",
          changeOrigin: true,
        },
      },
    },
  };
})
