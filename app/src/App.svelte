<script lang="ts">
  import { onMount, type Component } from 'svelte';

  import { errorText } from './lib/errors';
  import { missionDayLabel } from './lib/format';
  import LevelBadge from './lib/LevelBadge.svelte';
  import { app, navigate, refresh, type Screen } from './lib/state.svelte';
  import { MIN_PREFLIGHT_DAYS } from './lib/types';
  import DailyCheck from './screens/daily/DailyCheck.svelte';
  import Home from './screens/daily/Home.svelte';
  import PacketExport from './screens/daily/PacketExport.svelte';
  import Settings from './screens/daily/Settings.svelte';
  import Trends from './screens/daily/Trends.svelte';
  import BodyFigure from './screens/tests/BodyFigure.svelte';
  import Pvt from './screens/tests/Pvt.svelte';
  import VisionTest from './screens/tests/VisionTest.svelte';

  const SCREENS: { id: Screen; label: string; component: Component }[] = [
    { id: 'home', label: 'Home', component: Home },
    { id: 'daily_check', label: 'Daily check', component: DailyCheck },
    { id: 'pvt', label: 'PVT-B', component: Pvt },
    { id: 'vision', label: 'Vision test', component: VisionTest },
    { id: 'body', label: 'Body figure', component: BodyFigure },
    { id: 'trends', label: 'Trends', component: Trends },
    { id: 'export', label: 'Packet export', component: PacketExport },
    { id: 'settings', label: 'Settings', component: Settings },
  ];

  let dismissed = $state(false);
  const current = $derived(SCREENS.find((s) => s.id === app.route.screen) ?? SCREENS[0]);
  const notices = $derived(dismissed ? [] : (app.day?.mission.notices ?? []));

  onMount(refresh);
</script>

{#if app.error?.kind === 'rules'}
  <main class="blocked">
    <h1>The application cannot start</h1>
    <p>The rules file is not valid.</p>
    <p class="banner error" role="alert">{errorText(app.error)}</p>
    <p class="muted">Correct <code>rules/rules.toml</code> and build the application again.</p>
  </main>
{:else}
  <div class="shell">
    <nav aria-label="Screens">
      <p class="title">Astro Vitals</p>
      <p class="day">
        {app.day ? missionDayLabel(app.day.mission.mission_day) : 'Mission day unknown'}
      </p>
      {#if app.assessment}
        <LevelBadge state={app.assessment.level} />
      {/if}
      <ul>
        {#each SCREENS as s (s.id)}
          <li>
            <button
              class="nav"
              aria-current={s.id === current.id ? 'page' : undefined}
              onclick={() => navigate(s.id)}
            >
              {s.label}
            </button>
          </li>
        {/each}
      </ul>
      <p class="statement">Prototype, not a medical device.</p>
    </nav>
    <main>
      {#if app.error}
        <p class="banner error" role="alert">{errorText(app.error)}</p>
      {/if}
      {#each notices as notice (notice.kind)}
        <p class="banner warn" role="alert">
          <span>
            The data file was corrupt. The application started with empty data. The old file is
            <code>{notice.backup_path}</code>.
          </span>
          <button class="btn" onclick={() => (dismissed = true)}>Dismiss</button>
        </p>
      {/each}
      {#if app.assessment && !app.assessment.drift_enabled}
        <p class="banner info">
          The comparison with your baseline is off: {app.assessment.preflight_days} of
          {MIN_PREFLIGHT_DAYS} necessary pre-flight days have data. The fixed limits stay on.
        </p>
      {/if}
      <current.component />
    </main>
  </div>
{/if}

<style>
  .shell {
    display: grid;
    grid-template-columns: 13.5rem 1fr;
    min-height: 100vh;
  }
  nav {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 1.25rem 0.75rem;
    background: var(--surface);
    border-right: 1px solid var(--border);
    position: sticky;
    top: 0;
    height: 100vh;
  }
  .title {
    font-size: 1.15rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    padding: 0 0.5rem;
  }
  .day {
    padding: 0 0.5rem;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 0.75rem 0 0;
    width: 100%;
    display: grid;
    gap: 0.15rem;
  }
  .nav {
    width: 100%;
    text-align: left;
    padding: 0.5rem 0.6rem;
    border: 0;
    border-radius: var(--radius);
    background: none;
    color: var(--text);
    font: inherit;
    cursor: pointer;
  }
  .nav:hover {
    background: var(--hover);
  }
  .nav[aria-current='page'] {
    background: var(--accent-soft);
    font-weight: 600;
  }
  .statement {
    margin-top: auto;
    padding: 0.5rem;
    border: 1px dashed var(--border);
    border-radius: var(--radius);
    color: var(--muted);
    font-size: 0.8rem;
  }
  main {
    padding: 1.5rem 2rem 3rem;
    max-width: 62rem;
    width: 100%;
    display: grid;
    gap: 1rem;
    align-content: start;
  }
  .blocked {
    margin: 10vh auto;
    max-width: 40rem;
  }
</style>
