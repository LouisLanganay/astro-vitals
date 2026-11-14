import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig, type Plugin } from 'vite';

const webIcon: Plugin = {
  name: 'astro-vitals-web-icon',
  transformIndexHtml: () => [
    { tag: 'link', attrs: { rel: 'icon', href: 'data:,' }, injectTo: 'head' },
  ],
};

export default defineConfig(({ mode }) => ({
  base: mode === 'web' ? '/astro-vitals/' : '/',
  plugins: mode === 'web' ? [svelte(), webIcon] : [svelte()],
  clearScreen: false,
  build: mode === 'web' ? { outDir: '../target/pages', emptyOutDir: true } : {},
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ['**/src-tauri/**'] },
    fs: { allow: ['..'] },
  },
}));
