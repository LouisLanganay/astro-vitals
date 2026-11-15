import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  base: mode === 'web' ? '/astro-vitals/' : '/',
  plugins: [svelte()],
  clearScreen: false,
  build: mode === 'web' ? { outDir: '../target/pages', emptyOutDir: true } : {},
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ['**/src-tauri/**'] },
    fs: { allow: ['..'] },
  },
}));
