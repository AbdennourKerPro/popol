import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Relative base: the site works under a GitHub Pages sub-path (/popol/) as well as on a custom domain.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5174 },
  // The set-aside estimations in legacy/ target the previous programme: not run.
  // design/*.test.mjs: checks of the shared design system (contrasts, guard-rails).
  test: { include: ['src/**/*.test.{ts,mjs}', '../design/**/*.test.mjs'] },
});
