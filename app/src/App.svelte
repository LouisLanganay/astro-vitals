<script lang="ts">
  import { onMount, tick, type Component } from 'svelte';
  import { prefersReducedMotion } from 'svelte/motion';
  import { fly } from 'svelte/transition';

  import { errorText } from './lib/errors';
  import GradientDefs from './lib/GradientDefs.svelte';
  import Icon from './lib/Icon.svelte';
  import type { IconName } from './lib/icons';
  import LevelBadge from './lib/LevelBadge.svelte';
  import { MISSION_DAYS } from './lib/mission';
  import { app, navigate, refresh, type Screen } from './lib/state.svelte';
  import { theme, toggleTheme } from './lib/theme.svelte';
  import Ticker from './lib/Ticker.svelte';
  import { MIN_PREFLIGHT_DAYS } from './lib/types';
  import DailyCheck from './screens/daily/DailyCheck.svelte';
  import Home from './screens/daily/Home.svelte';
  import PacketExport from './screens/daily/PacketExport.svelte';
  import Settings from './screens/daily/Settings.svelte';
  import Trends from './screens/daily/Trends.svelte';
  import BodyFigure from './screens/tests/BodyFigure.svelte';
  import Pvt from './screens/tests/Pvt.svelte';
  import VisionTest from './screens/tests/VisionTest.svelte';

  interface ScreenDef {
    id: Screen;
    label: string;
    title: string;
    icon: IconName;
    component: Component;
  }

  const SCREENS: ScreenDef[] = [
    { id: 'home', label: 'Today', title: 'Today', icon: 'home', component: Home },
    { id: 'daily_check', label: 'Daily check', title: 'Daily check', icon: 'check', component: DailyCheck },
    { id: 'body', label: 'Body', title: 'Body', icon: 'body', component: BodyFigure },
    { id: 'trends', label: 'Trends', title: 'Trends', icon: 'trends', component: Trends },
    { id: 'pvt', label: 'PVT-B', title: 'PVT-B reaction test', icon: 'bolt', component: Pvt },
    { id: 'vision', label: 'Vision test', title: 'Vision test', icon: 'eye', component: VisionTest },
    { id: 'export', label: 'Export', title: 'Packet for the flight surgeon', icon: 'export', component: PacketExport },
    { id: 'settings', label: 'Settings', title: 'Settings', icon: 'settings', component: Settings },
  ];

  let dismissed = $state(false);
  const current = $derived(SCREENS.find((s) => s.id === app.route.screen) ?? SCREENS[0]);
  const notices = $derived(dismissed ? [] : (app.day?.mission.notices ?? []));
  const day = $derived(app.day?.mission.mission_day ?? null);
  const progress = $derived(day == null ? 0 : Math.max(0, Math.min(1, day / MISSION_DAYS)));
  const checkDue = $derived(app.day?.mission.due.some((t) => t.kind === 'daily_check') ?? false);

  // Active pill that slides between the navigation items.
  let navEl = $state<HTMLElement>();
  let pill = $state({ x: 0, y: 0, w: 0, h: 0, ready: false });

  async function placePill() {
    await tick();
    const el = navEl?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!el) return;
    pill = { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight, ready: true };
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }

  $effect(() => {
    void current.id;
    placePill();
  });

  function go(id: Screen) {
    if (id === current.id) return;
    navigate(id);
    window.scrollTo({ top: 0 });
  }

  onMount(() => {
    refresh();
    const ro = new ResizeObserver(() => placePill());
    if (navEl) ro.observe(navEl);
    return () => ro.disconnect();
  });
</script>

<GradientDefs />

{#if app.error?.kind === 'rules'}
  <main class="blocked">
    <h1>The application cannot start</h1>
    <p>The rules file is not valid.</p>
    <p class="banner error" role="alert">{errorText(app.error)}</p>
    <p class="muted">Correct <code>rules/rules.toml</code> and build the application again.</p>
  </main>
{:else}
  <div class="app">
    <aside class="rail">
      <div class="brand">
        <span class="mark">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle class="pl" cx="12" cy="12" r="4.6" />
            <ellipse cx="12" cy="12" rx="10.2" ry="4" transform="rotate(-24 12 12)" />
          </svg>
        </span>
        <div class="bt">
          <b>Astro Vitals</b>
          <span>Crew health, Mars transit</span>
        </div>
        <button
          class="btn ghost icon theme"
          onclick={toggleTheme}
          aria-label={theme.value === 'dark' ? 'Use the light theme' : 'Use the dark theme'}
          title={theme.value === 'dark' ? 'Light theme' : 'Dark theme'}
        >
          {#key theme.value}
            <span class="pop"><Icon name={theme.value === 'dark' ? 'sun' : 'moon'} size={18} /></span>
          {/key}
        </button>
      </div>

      <nav class="nav" aria-label="Screens" bind:this={navEl}>
        <span
          class="pill"
          class:ready={pill.ready}
          style:transform="translate({pill.x}px, {pill.y}px)"
          style:width="{pill.w}px"
          style:height="{pill.h}px"
          aria-hidden="true"
        ></span>
        {#each SCREENS as s (s.id)}
          <button
            class="item"
            aria-current={s.id === current.id ? 'page' : undefined}
            onclick={() => go(s.id)}
          >
            <Icon name={s.icon} size={18} />
            <span>{s.label}</span>
            {#if s.id === 'daily_check' && checkDue}
              <i class="due" aria-label="due"></i>
            {/if}
          </button>
        {/each}
      </nav>

      <div class="mission" aria-label="Mission progress">
        <span class="eyebrow">{day != null && day < 0 ? 'Pre-flight' : 'Mission day'}</span>
        <div class="big">
          {#if day != null}<Ticker value={day} />{:else}-{/if}<small>/ {MISSION_DAYS}</small>
        </div>
        <div class="mbar"><i style:transform="scaleX({progress})"></i></div>
      </div>
    </aside>

    <header class="phead">
      <div>
        <p class="eyebrow">
          {#if day == null}
            Mission day unknown
          {:else if day < 0}
            Pre-flight day {day}, launch in {-day} days
          {:else}
            Mission day {day} of {MISSION_DAYS}, Mars transit
          {/if}
        </p>
        {#key current.id}
          <h1 in:fly={{ y: prefersReducedMotion.current ? 0 : 6, duration: prefersReducedMotion.current ? 0 : 220 }}>
            {current.title}
          </h1>
        {/key}
      </div>
      {#if app.assessment}
        <LevelBadge state={app.assessment.level} size="lg" />
      {/if}
    </header>

    <main id="view">
      {#if app.error}
        <p class="banner error" role="alert">{errorText(app.error)}</p>
      {/if}
      {#each notices as notice (notice.kind)}
        <p class="banner warn" role="alert">
          <span>
            The data file was corrupt. The application started with empty data. The old file is
            <code>{notice.backup_path}</code>.
          </span>
          <button class="btn sm" onclick={() => (dismissed = true)}>Dismiss</button>
        </p>
      {/each}
      {#if app.assessment && !app.assessment.drift_enabled}
        <p class="banner info">
          The comparison with your baseline is off: {app.assessment.preflight_days} of
          {MIN_PREFLIGHT_DAYS} necessary pre-flight days have data. The fixed limits stay on.
        </p>
      {/if}
      {#key current.id}
        <div
          class="screen"
          in:fly={{
            y: prefersReducedMotion.current ? 0 : 8,
            duration: prefersReducedMotion.current ? 0 : 240,
            opacity: 0,
          }}
        >
          <current.component />
        </div>
      {/key}
    </main>

    <p class="foot" role="note">
      <b>Prototype, not a medical device.</b> It compares you with your own pre-flight baseline,
      explains each result and gives one action. It does not diagnose. Data stays on this device.
    </p>
  </div>
{/if}

<style>
  .app {
    max-width: 1380px;
    margin: 0 auto;
    padding: 0 max(16px, env(safe-area-inset-right, 0px)) 48px max(16px, env(safe-area-inset-left, 0px));
    display: grid;
    column-gap: 36px;
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: 'rail' 'head' 'main' 'foot';
  }
  @media (min-width: 1000px) {
    .app {
      grid-template-columns: 212px minmax(0, 1fr);
      grid-template-areas: 'rail head' 'rail main' 'rail foot';
      grid-template-rows: auto auto 1fr;
    }
  }
  .rail {
    grid-area: rail;
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding-top: 18px;
    min-width: 0;
  }
  .phead {
    grid-area: head;
  }
  #view {
    grid-area: main;
    min-width: 0;
    display: grid;
    gap: 16px;
    align-content: start;
  }
  .foot {
    grid-area: foot;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 6px;
  }
  .bt {
    flex: 1;
    min-width: 0;
  }
  .mark {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    flex: none;
    background: linear-gradient(180deg, var(--raise-a), var(--raise-b));
    box-shadow: inset 0 1px 0 var(--hi), 0 0 0 1px var(--line);
  }
  .mark svg {
    width: 22px;
    height: 22px;
    fill: none;
    stroke: var(--fg);
    stroke-width: 1.6;
  }
  .mark svg .pl {
    fill: var(--ui);
    stroke: none;
  }
  .brand b {
    display: block;
    font-weight: 500;
    font-size: 15.5px;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }
  .brand .bt span {
    display: block;
    font-size: 12px;
    color: var(--muted);
  }
  .theme .pop {
    display: grid;
  }

  .nav {
    position: relative;
    display: flex;
    gap: 4px;
    overflow-x: auto;
    scrollbar-width: none;
    margin: 0 -4px;
    padding: 4px;
  }
  .nav::-webkit-scrollbar {
    display: none;
  }
  .pill {
    position: absolute;
    top: 0;
    left: 0;
    border-radius: 14px;
    background: linear-gradient(180deg, var(--raise-a), var(--raise-b));
    box-shadow: inset 0 1px 0 var(--hi), 0 1px 3px rgba(0, 0, 0, 0.35), 0 0 0 1px var(--line);
    opacity: 0;
    pointer-events: none;
  }
  .pill.ready {
    opacity: 1;
    transition:
      transform 280ms var(--ease-spring),
      width 280ms var(--ease-out),
      height 280ms var(--ease-out);
  }
  .item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    flex: none;
    min-height: 44px;
    padding: 10px 14px;
    border: 0;
    border-radius: 14px;
    background: none;
    color: var(--muted);
    font-weight: 500;
    font-size: 14.5px;
    white-space: nowrap;
    cursor: pointer;
    transition:
      color var(--t-fast),
      background-color var(--t-fast),
      transform var(--t-fast) var(--ease-out);
  }
  .item:hover {
    color: var(--fg);
    background: color-mix(in srgb, var(--well) 70%, transparent);
  }
  .item:active {
    transform: scale(0.97);
  }
  .item[aria-current='page'] {
    color: var(--fg);
    background: none;
  }
  .due {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--ui);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--ui) 22%, transparent);
    animation: pop-in 300ms var(--ease-spring) both;
  }

  .mission {
    display: none;
  }
  .mission .big {
    font-size: 34px;
  }
  .mbar {
    height: 6px;
    border-radius: 3px;
    background: var(--well-2);
    overflow: hidden;
  }
  .mbar i {
    display: block;
    height: 100%;
    border-radius: 3px;
    background: linear-gradient(90deg, var(--ui-2), var(--ui));
    transform-origin: left;
    transition: transform 600ms var(--ease-out);
  }
  @media (min-width: 1000px) {
    .rail {
      position: sticky;
      top: env(safe-area-inset-top, 0px);
      align-self: start;
      padding-top: 34px;
      gap: 28px;
    }
    .nav {
      flex-direction: column;
      overflow: visible;
    }
    .due {
      margin-left: auto;
    }
    .mission {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 18px;
      border-radius: 20px;
      background: linear-gradient(180deg, var(--card-a), var(--card-b));
      box-shadow: inset 0 1px 0 var(--line), 0 0 0 1px var(--edge);
    }
  }

  .phead {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px 20px;
    padding: 26px 0 22px;
  }
  .phead h1 {
    font-size: clamp(30px, 3.2vw, 40px);
    font-weight: 500;
    letter-spacing: -0.04em;
    line-height: 1.05;
    margin-top: 6px;
    text-wrap: balance;
  }
  @media (min-width: 1000px) {
    .phead {
      padding: 38px 0 26px;
    }
  }
  .screen {
    min-width: 0;
  }
  .foot {
    margin-top: 28px;
    font-size: 12.5px;
    color: var(--faint);
    max-width: 90ch;
  }
  .foot b {
    color: var(--muted);
    font-weight: 500;
  }
  .blocked {
    margin: 10vh auto;
    max-width: 40rem;
    display: grid;
    gap: 12px;
    padding: 0 16px;
  }
</style>
