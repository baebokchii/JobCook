import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Fix: Cast process to any to avoid TypeScript error about missing cwd property on Process type
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    build: {
      chunkSizeWarningLimit: 1600,
    },
    define: {
      // Polyfill process.env.API_KEY for the GenAI SDK
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});