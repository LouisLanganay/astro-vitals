<script lang="ts">
  import { onMount, tick, type Component } from 'svelte';
  import { prefersReducedMotion } from 'svelte/motion';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

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
    short: string;
    title: string;
    main: boolean;
    sub: string;
    icon: IconName;
    component: Component;
  }

  const SCREENS: ScreenDef[] = [
    { id: 'home', label: 'Today', short: 'Today', title: 'Today', icon: 'home', main: true, sub: '', component: Home },
    { id: 'daily_check', label: 'Daily check', short: 'Check', title: 'Daily check', icon: 'check', main: true, sub: '', component: DailyCheck },
    { id: 'body', label: 'Body', short: 'Body', title: 'Body', icon: 'body', main: true, sub: '', component: BodyFigure },
    { id: 'trends', label: 'Trends', short: 'Trends', title: 'Trends', icon: 'trends', main: true, sub: '', component: Trends },
    { id: 'pvt', label: 'PVT-B', short: 'PVT-B', title: 'PVT-B reaction test', icon: 'bolt', main: false, sub: 'Reaction test, 3 minutes', component: Pvt },
    { id: 'vision', label: 'Vision test', short: 'Vision', title: 'Vision test', icon: 'eye', main: false, sub: 'Acuity and Amsler grid, each week', component: VisionTest },
    { id: 'export', label: 'Export', short: 'Export', title: 'Packet for the flight surgeon', icon: 'export', main: false, sub: 'Packet for the flight surgeon', component: PacketExport },
    { id: 'settings', label: 'Settings', short: 'Settings', title: 'Rules and settings', icon: 'settings', main: false, sub: 'Rules, mission and scenarios', component: Settings },
  ];
  const MORE = SCREENS.filter((s) => !s.main);

  let dismissed = $state(false);
  const current = $derived(SCREENS.find((s) => s.id === app.route.screen) ?? SCREENS[0]);
  const notices = $derived(dismissed ? [] : (app.day?.mission.notices ?? []));
  const day = $derived(app.day?.mission.mission_day ?? null);
  const progress = $derived(day == null ? 0 : Math.max(0, Math.min(1, day / MISSION_DAYS)));
  const checkDue = $derived(app.day?.mission.due.some((t) => t.kind === 'daily_check') ?? false);

  let navEl = $state<HTMLElement>();
  let headEl = $state<HTMLElement>();
  let scrolled = $state(false);
  let stuck = $state(false);
  let pill = $state({ x: 0, y: 0, w: 0, h: 0, ready: false });
  let moreOpen = $state(false);
  let moreBtn = $state<HTMLButtonElement>();
  let sheetEl = $state<HTMLElement>();
  const inMore = $derived(!current.main);

  async function placePill() {
    await tick();
    const all = navEl?.querySelectorAll<HTMLElement>('[aria-current="page"]') ?? [];
    const el = Array.from(all).find((e) => e.offsetParent !== null);
    if (!el) return;
    pill = { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight, ready: true };
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }

  $effect(() => {
    void current.id;
    placePill();
  });

  function go(id: Screen) {
    moreOpen = false;
    if (id === current.id) return;
    navigate(id);
    window.scrollTo({ top: 0 });
  }

  async function openMore() {
    moreOpen = true;
    await tick();
    sheetEl?.querySelector<HTMLElement>('[aria-current="page"], .tile')?.focus({ preventScroll: true });
  }

  function closeMore(refocus = true) {
    if (!moreOpen) return;
    moreOpen = false;
    if (refocus) moreBtn?.focus({ preventScroll: true });
  }

  function sheetKey(e: KeyboardEvent) {
    if (!moreOpen) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeMore();
      return;
    }
    if (e.key !== 'Tab' || !sheetEl) return;
    const items = Array.from(sheetEl.querySelectorAll<HTMLElement>('button'));
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  onMount(() => {
    refresh();
    const onScroll = () => (stuck = window.scrollY > 2);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const wide = matchMedia('(min-width: 1000px)');
    const onWide = () => wide.matches && closeMore(false);
    wide.addEventListener('change', onWide);
    const ro = new ResizeObserver(() => placePill());
    if (navEl) ro.observe(navEl);
    const io = new IntersectionObserver(
      ([e]) => (scrolled = !e.isIntersecting && e.boundingClientRect.top < 0),
      { rootMargin: '-72px 0px 0px 0px' },
    );
    if (headEl) io.observe(headEl);
    return () => {
      window.removeEventListener('scroll', onScroll);
      wide.removeEventListener('change', onWide);
      ro.disconnect();
      io.disconnect();
    };
  });
</script>

<GradientDefs />
<svelte:window onkeydown={sheetKey} />

{#if app.error?.kind === 'rules'}
  <main class="blocked">
    <h1>The application cannot start</h1>
    <p>The rules file is not valid.</p>
    <p class="banner error" role="alert">{errorText(app.error)}</p>
    <p class="muted">Correct <code>rules/rules.toml</code> and build the application again.</p>
  </main>
{:else}
  <div class="app">
    <aside class="rail" class:stuck>
      <div class="brand">
        <span class="mark">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle class="pl" cx="12" cy="12" r="4.6" />
            <ellipse cx="12" cy="12" rx="10.2" ry="4" transform="rotate(-24 12 12)" />
          </svg>
        </span>
        <div class="bt">
          <div class="bn" class:out={scrolled}>
            <b>Astro Vitals</b>
          </div>
          <span class="ctitle" class:in={scrolled} aria-hidden="true">{current.title}</span>
        </div>
        {#if day != null}
          <span class="mday" aria-label="Mission day {day} of {MISSION_DAYS}">
            {day < 0 ? 'Pre' : 'Day'} <b>{Math.abs(day)}</b>/{MISSION_DAYS}
          </span>
        {/if}
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
            class:sec={!s.main}
            title={s.label}
            aria-current={s.id === current.id ? 'page' : undefined}
            onclick={() => go(s.id)}
          >
            <Icon name={s.icon} size={18} active={s.id === current.id} />
            <span class="long">{s.label}</span>
            <span class="short" aria-hidden="true">{s.short}</span>
            {#if s.id === 'daily_check' && checkDue}
              <i class="due" aria-hidden="true" title="Due today"></i>
            {/if}
          </button>
        {/each}
        <button
          class="item more"
          bind:this={moreBtn}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          aria-current={inMore ? 'page' : undefined}
          onclick={() => (moreOpen ? closeMore() : openMore())}
        >
          {#key moreOpen ? 'close' : inMore ? current.icon : 'more'}
            <span class="swap">
              <Icon name={moreOpen ? 'close' : inMore ? current.icon : 'more'} size={18} active={moreOpen} />
            </span>
          {/key}
          <span class="long">More screens</span>
          <span class="short" aria-hidden="true">{inMore && !moreOpen ? current.short : 'More'}</span>
        </button>
      </nav>

      <div class="mission" aria-label="Mission progress">
        <span class="eyebrow">{day != null && day < 0 ? 'Pre-flight' : 'Mission day'}</span>
        <div class="big">
          {#if day != null}<Ticker value={day} />{:else}-{/if}<small>/ {MISSION_DAYS}</small>
        </div>
        <div class="mbar"><i style:transform="scaleX({progress})"></i></div>
      </div>
    </aside>

    <header class="phead" bind:this={headEl}>
      <div>
        {#if day == null}
          <p class="eyebrow">Mission day unknown</p>
        {:else if day < 0}
          <p class="eyebrow">Launch in {-day} {day === -1 ? 'day' : 'days'}</p>
        {/if}
        {#key current.id}
          <h1 in:fly={{ y: prefersReducedMotion.current ? 0 : 6, duration: prefersReducedMotion.current ? 0 : 220 }}>
            {current.title}
          </h1>
        {/key}
      </div>
      {#if app.assessment && current.id !== 'home'}
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
          <button class="btn sm icon" onclick={() => (dismissed = true)} aria-label="Dismiss" title="Dismiss">
            <Icon name="close" size={15} />
          </button>
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
      <b>Prototype, not a medical device.</b> Data stays on this device.
    </p>
  </div>
  {#if moreOpen}
    <div
      class="scrim"
      role="presentation"
      transition:fade={{ duration: prefersReducedMotion.current ? 0 : 180 }}
      onclick={() => closeMore()}
    ></div>
    <div
      class="sheet"
      role="dialog"
      aria-modal="true"
      aria-label="More screens"
      bind:this={sheetEl}
      transition:fly={{ y: prefersReducedMotion.current ? 0 : 28, duration: prefersReducedMotion.current ? 0 : 260, easing: cubicOut }}
    >
      {#each MORE as s, i (s.id)}
        <button
          class="tile"
          style:--i={i}
          aria-current={s.id === current.id ? 'page' : undefined}
          onclick={() => go(s.id)}
        >
          <span class="ic"><Icon name={s.icon} size={19} active={s.id === current.id} /></span>
          <b>{s.label}</b>
          <span class="tsub">{s.sub}</span>
        </button>
      {/each}
    </div>
  {/if}
{/if}

<style>
  .app {
    max-width: 1380px;
    margin: 0 auto;
    padding: 0 max(16px, env(safe-area-inset-right, 0px)) calc(104px + env(safe-area-inset-bottom, 0px))
      max(16px, env(safe-area-inset-left, 0px));
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
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding-top: calc(10px + env(safe-area-inset-top, 0px));
    padding-bottom: 10px;
    min-width: 0;
  }
  .rail::before {
    content: '';
    position: absolute;
    inset: 0 calc(-1 * max(16px, env(safe-area-inset-right, 0px))) 0 calc(-1 * max(16px, env(safe-area-inset-left, 0px)));
    z-index: -1;
    background: color-mix(in srgb, var(--bg) 82%, transparent);
    backdrop-filter: blur(18px) saturate(1.4);
    -webkit-backdrop-filter: blur(18px) saturate(1.4);
    box-shadow: 0 1px 0 var(--line);
    opacity: 0;
    transition: opacity var(--t-fast) var(--ease-out);
  }
  .rail.stuck::before {
    opacity: 1;
  }
  .phead {
    grid-area: head;
  }
  #view {
    grid-area: main;
    min-width: 0;
    display: grid;
    gap: 0;
    align-content: start;
  }
  .foot {
    grid-area: foot;
  }

  .brand {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 6px;
  }
  .bt {
    position: relative;
    flex: 1;
    min-width: 0;
  }
  .bn {
    transition:
      opacity 200ms var(--ease-out),
      translate 260ms var(--ease-out);
  }
  .bn.out {
    opacity: 0;
    translate: 0 -8px;
  }
  .brand .bt .ctitle {
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 17px;
    font-weight: 500;
    letter-spacing: -0.02em;
    color: var(--fg);
    opacity: 0;
    translate: 0 calc(-50% + 10px);
    pointer-events: none;
    transition:
      opacity 200ms var(--ease-out),
      translate 260ms var(--ease-out);
  }
  .brand .bt .ctitle.in {
    opacity: 1;
    translate: 0 -50%;
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
  .brand .bn b {
    display: block;
    font-weight: 500;
    font-size: 15.5px;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }
  .theme .pop {
    display: grid;
  }
  .mday {
    flex: none;
    white-space: nowrap;
    padding: 5px 10px;
    border-radius: 10px;
    font-size: 12px;
    color: var(--muted);
    background: var(--well);
    box-shadow: inset 0 0 0 1px var(--line);
    font-variant-numeric: tabular-nums;
  }
  .mday b {
    color: var(--fg);
    font-weight: 500;
  }

  .nav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 30;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 2px;
    padding: 6px max(6px, env(safe-area-inset-right, 0px)) calc(6px + env(safe-area-inset-bottom, 0px))
      max(6px, env(safe-area-inset-left, 0px));
    background: color-mix(in srgb, var(--bg) 84%, transparent);
    backdrop-filter: blur(18px) saturate(1.4);
    -webkit-backdrop-filter: blur(18px) saturate(1.4);
    box-shadow: 0 -1px 0 var(--line);
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
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5px;
    min-width: 0;
    min-height: 56px;
    padding: 8px 2px;
    border: 0;
    border-radius: 14px;
    background: none;
    color: var(--muted);
    font-weight: 500;
    font-size: 10.5px;
    white-space: nowrap;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    transition:
      color var(--t-fast),
      background-color var(--t-fast),
      transform var(--t-fast) var(--ease-out);
  }
  @media (hover: hover) {
    .item:hover {
      color: var(--fg);
      background: color-mix(in srgb, var(--well) 70%, transparent);
    }
  }
  .item:active {
    transform: scale(0.97);
  }
  .item[aria-current='page'] {
    color: var(--fg);
    background: none;
  }
  .nav {
    transition: transform 240ms var(--ease-out);
  }
  :global(html[data-test-running]) .nav {
    transform: translateY(110%);
    pointer-events: none;
  }
  .item.sec {
    display: none;
  }
  .swap {
    display: grid;
    animation: pop-in 240ms var(--ease-spring) both;
  }
  .scrim {
    position: fixed;
    inset: 0 0 calc(68px + env(safe-area-inset-bottom, 0px));
    z-index: 35;
    background: rgba(0, 0, 0, 0.42);
    -webkit-tap-highlight-color: transparent;
  }
  .sheet {
    position: fixed;
    left: max(10px, env(safe-area-inset-left, 0px));
    right: max(10px, env(safe-area-inset-right, 0px));
    bottom: calc(76px + env(safe-area-inset-bottom, 0px));
    z-index: 40;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    max-width: 560px;
    margin: 0 auto;
    padding: 10px;
    border-radius: 24px;
    background: linear-gradient(180deg, var(--card-a), var(--card-b));
    box-shadow: inset 0 1px 0 var(--line), 0 0 0 1px var(--edge), var(--shadow);
  }
  .tile {
    display: grid;
    justify-items: start;
    align-content: start;
    gap: 4px;
    min-height: 104px;
    padding: 14px;
    border: 0;
    border-radius: 16px;
    background: var(--well);
    box-shadow: inset 0 0 0 1px var(--line);
    color: var(--fg);
    font: inherit;
    text-align: left;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    animation: rise-in 280ms var(--ease-out) backwards;
    animation-delay: calc(var(--i) * 35ms + 40ms);
    transition:
      transform var(--t-fast) var(--ease-out),
      background-color var(--t-fast);
  }
  .tile:active {
    transform: scale(0.97);
  }
  .tile[aria-current='page'] {
    background: var(--well-2);
    box-shadow: inset 0 0 0 1.5px var(--ui);
  }
  .tile .ic {
    margin-bottom: 6px;
  }
  .tile b {
    font-weight: 500;
    font-size: 15px;
    letter-spacing: -0.01em;
  }
  .tsub {
    font-size: 12.5px;
    line-height: 1.35;
    color: var(--muted);
  }
  @media (hover: hover) {
    .tile:hover {
      background: var(--well-2);
    }
  }
  .item .long {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .item .short {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .due {
    position: absolute;
    top: 7px;
    right: calc(50% - 17px);
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
    animation: grow-x 900ms 200ms var(--ease-out) backwards;
  }
  @media (min-width: 1000px) {
    .rail {
      position: sticky;
      top: env(safe-area-inset-top, 0px);
      z-index: auto;
      align-self: start;
      padding-top: 34px;
      padding-bottom: 0;
      gap: 28px;
    }
    .rail::before,
    .brand .bt .ctitle {
      display: none;
    }
    .bn.out {
      opacity: 1;
      translate: none;
    }
    .nav,
    :global(html[data-test-running]) .nav {
      transform: none;
      pointer-events: auto;
    }
    .nav {
      position: relative;
      inset: auto;
      z-index: auto;
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin: 0 -4px;
      padding: 4px;
      background: none;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
      box-shadow: none;
    }
    .item {
      flex-direction: row;
      justify-content: flex-start;
      gap: 12px;
      min-height: 44px;
      padding: 10px 14px;
      font-size: 14.5px;
    }
    .item.sec {
      display: flex;
    }
    .item.more,
    .scrim,
    .sheet {
      display: none;
    }
    .item .long {
      position: static;
      width: auto;
      height: auto;
      overflow: visible;
      clip-path: none;
    }
    .item .short,
    .mday {
      display: none;
    }
    .due {
      position: static;
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

  @media (min-width: 1000px) and (max-width: 1199px) {
    .app {
      grid-template-columns: 64px minmax(0, 1fr);
      column-gap: 28px;
    }
    .brand {
      flex-direction: column;
      padding: 0;
    }
    .brand .bt {
      display: none;
    }
    .item {
      justify-content: center;
      padding: 12px 0;
    }
    .item .long {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
    .due {
      position: absolute;
      top: 9px;
      right: 11px;
    }
    .mission {
      padding: 14px 6px;
      align-items: center;
      text-align: center;
    }
    .mission .eyebrow,
    .mission .big small {
      display: none;
    }
    .mission .big {
      font-size: 22px;
    }
    .mbar {
      width: 100%;
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
