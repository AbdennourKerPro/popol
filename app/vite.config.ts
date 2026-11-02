import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base: the site works under a GitHub Pages sub-path (/popol/) as well as on a custom domain.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5174 },
});
