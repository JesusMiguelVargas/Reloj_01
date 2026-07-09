import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // En GitHub Pages la app vive bajo /<nombre-del-repo>/; el workflow
  // define BASE_PATH. En local queda en la raíz.
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
});
