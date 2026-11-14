import { mount } from 'svelte';

import App from './App.svelte';
import { initTheme } from './lib/theme.svelte';
import './app.css';

initTheme();

async function start() {
  // In a normal browser during development, answer the Tauri commands with mock data.
  if (import.meta.env.DEV && !('__TAURI_INTERNALS__' in window)) {
    await import('./dev/mock');
  }
  return mount(App, { target: document.getElementById('app')! });
}

void start();
