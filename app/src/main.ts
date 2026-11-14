import { mount } from 'svelte';

import App from './App.svelte';
import { landingWanted } from './landing/gate';
import { initTheme } from './lib/theme.svelte';
import './app.css';

initTheme();

async function engine() {
  if (import.meta.env.MODE === 'web') {
    const web = await import('./web/start');
    await web.startWeb();
    return web.showNote;
  }
  if (import.meta.env.DEV && !('__TAURI_INTERNALS__' in window)) await import('./dev/mock');
  return null;
}

async function landing() {
  if (!landingWanted()) return null;
  try {
    return await (await import('./landing/run')).runLanding();
  } catch {
    return null;
  }
}

async function start() {
  const ready = engine();
  ready.catch(() => undefined);
  const reveal = await landing();
  const showNote = await ready;
  const app = mount(App, { target: document.getElementById('app')! });
  reveal?.();
  showNote?.();
  return app;
}

void start();
