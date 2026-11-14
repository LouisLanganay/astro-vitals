<script lang="ts">
  import { onMount } from 'svelte';
  import { prefersReducedMotion } from 'svelte/motion';

  import Icon from '../lib/Icon.svelte';
  import type { IconName } from '../lib/icons';
  import { MISSION_DAYS } from '../lib/mission';
  import { createScene, type Scene } from './scene';
  import { AIRLOCK, ZONES } from './ship';

  let {
    oncovered,
    ondone,
  }: {
    oncovered: (reveal: () => void) => void;
    ondone: () => void;
  } = $props();

  const OPEN_MS = 860;
  const OPEN_EASE = 'cubic-bezier(0.62, 0, 0.18, 1)';
  const INFO: Record<number, { title: string; line: string; icon: IconName }> = {
    1: { title: 'Airlock', line: 'Select to enter.', icon: 'chevron' },
    2: { title: 'Habitat', line: 'Daily check: sleep, mood, fluid.', icon: 'check' },
    3: { title: 'Gravity ring', line: 'Exercise keeps muscle and bone.', icon: 'dumbbell' },
    4: { title: 'Solar arrays', line: `${MISSION_DAYS} days of transit to Mars.`, icon: 'sun' },
    5: { title: 'Service module', line: 'Rules watch each value.', icon: 'rules' },
  };

  let canvas = $state<HTMLCanvasElement>();
  let pin = $state<HTMLElement>();
  let cta = $state<HTMLButtonElement>();
  let hero = $state<HTMLElement>();
  let phase = $state<'idle' | 'leaving' | 'opening' | 'out'>('idle');
  let halo = $state<HTMLElement>();
  let panel = $state<HTMLElement>();
  let zone = $state(0);
  let corner = $state('tr');
  let shown = $state(INFO[AIRLOCK]);
  let scene: Scene | null = null;

  function anchor(x: number, y: number, alpha: number) {
    if (!pin) return;
    pin.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
    pin.style.opacity = alpha.toFixed(3);
  }

  function place(x: number, y: number) {
    if (!panel) return;
    panel.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
    const next = `${y < 170 ? 'b' : 't'}${x > window.innerWidth - 270 ? 'l' : 'r'}`;
    if (next !== corner) corner = next;
  }

  function aim(next: number) {
    if (next === zone) return;
    zone = next;
    if (next > 0) shown = INFO[ZONES[next - 1].id];
    scene?.focus(next);
  }

  function hover(e: PointerEvent) {
    if (phase === 'idle' && e.pointerType === 'mouse') aim(scene?.pick(e.clientX, e.clientY) ?? 0);
  }

  function tap(e: MouseEvent) {
    if (phase !== 'idle') return;
    const hit = scene?.pick(e.clientX, e.clientY) ?? 0;
    if (hit > 0 && ZONES[hit - 1].id === AIRLOCK) enter();
    else aim(hit === zone && (e as PointerEvent).pointerType !== 'mouse' ? 0 : hit);
  }

  function leave(e: PointerEvent) {
    if (e.pointerType === 'mouse') aim(0);
  }

  function frame(wide: boolean) {
    const box = hero?.getBoundingClientRect();
    if (!box) return null;
    const side = Math.max(0.34, Math.min(0.5, (box.right + 36) / window.innerWidth));
    const floor = Math.max(0.4, Math.min(0.68, (box.top - 30) / window.innerHeight));
    return wide ? [side, 0.07, 1.04, 0.93] : [0.05, 0.1, 1.16, floor];
  }

  onMount(() => {
    scene = createScene(canvas!, {
      reduced: prefersReducedMotion.current,
      frame,
      onanchor: anchor,
      onzone: place,
    });
    const observer = new ResizeObserver(() => phase === 'idle' && scene?.refit());
    observer.observe(hero!);
    const view = canvas!;
    view.addEventListener('pointermove', hover);
    view.addEventListener('pointerleave', leave);
    view.addEventListener('click', tap);
    return () => {
      observer.disconnect();
      view.removeEventListener('pointermove', hover);
      view.removeEventListener('pointerleave', leave);
      view.removeEventListener('click', tap);
      scene?.destroy();
    };
  });

  async function enter() {
    if (phase === 'leaving') {
      scene?.skip();
      return;
    }
    if (phase !== 'idle') return;
    aim(0);
    phase = 'leaving';
    await scene?.enter();
    oncovered(prefersReducedMotion.current ? fade : open);
  }

  function fade() {
    phase = 'out';
    setTimeout(ondone, 0);
  }

  function open() {
    const app = document.getElementById('app');
    if (!app || !halo) {
      fade();
      return;
    }
    phase = 'opening';
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const radius = Math.hypot(cx, cy) + 80;
    const timing = { duration: OPEN_MS, easing: OPEN_EASE };
    halo.style.width = halo.style.height = `${radius * 2}px`;
    app.style.position = 'relative';
    app.style.zIndex = '1001';
    app.style.background = 'var(--bg)';
    const iris = app.animate(
      [
        { clipPath: `circle(0px at ${cx}px ${cy}px)` },
        { clipPath: `circle(${radius}px at ${cx}px ${cy}px)` },
      ],
      timing,
    );
    halo.animate(
      [
        { scale: 0, opacity: 1 },
        { scale: 0.7, opacity: 1, offset: 0.7 },
        { scale: 1, opacity: 0 },
      ],
      timing,
    );
    document.getElementById('view')?.animate(
      [
        { scale: 0.88, opacity: 0 },
        { opacity: 1, offset: 0.5 },
        { scale: 1, opacity: 1 },
      ],
      { duration: OPEN_MS + 160, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
    );
    let follow = 0;
    const track = () => {
      scene?.hole((iris.effect?.getComputedTiming().progress ?? 1) * radius);
      follow = requestAnimationFrame(track);
    };
    track();
    const end = () => {
      cancelAnimationFrame(follow);
      app.style.position = '';
      app.style.zIndex = '';
      app.style.background = '';
      ondone();
    };
    iris.finished.then(end, end);
  }

  function key(e: KeyboardEvent) {
    if (e.key === 'Escape' && phase === 'leaving') scene?.skip();
    if (e.key === 'Enter' && phase === 'idle' && e.target !== cta) enter();
  }

  function press() {
    if (phase === 'leaving') scene?.skip();
  }
</script>

<svelte:window onkeydown={key} onpointerdown={press} />

<div class="landing" data-phase={phase}>
  <canvas bind:this={canvas} class:hit={zone > 0} aria-hidden="true"></canvas>
  <div class="veil" aria-hidden="true"></div>

  <i class="pin" bind:this={pin} aria-hidden="true"></i>

  <div class="tip" class:on={zone > 0} data-corner={corner} bind:this={panel} aria-hidden="true">
    <i class="tip-dot"></i>
    <i class="tip-line"></i>
    <div class="tip-card">
      <span class="ic"><Icon name={shown.icon} size={17} /></span>
      <span class="tip-txt">
        <b>{shown.title}</b>
        <span>{shown.line}</span>
      </span>
    </div>
  </div>

  <header class="top">
    <span class="mark">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle class="pl" cx="12" cy="12" r="4.6" />
        <ellipse cx="12" cy="12" rx="10.2" ry="4" transform="rotate(-24 12 12)" />
      </svg>
    </span>
    <span class="name">
      <b>Astro Vitals</b>
      <span>Crew health</span>
    </span>
  </header>

  <main class="hero" bind:this={hero}>
    <p class="eyebrow">Mars transit</p>
    <h1>Welcome on board.</h1>
    <p class="sub">Do your health check each day of the flight.</p>
    <button class="btn violet big" bind:this={cta} onclick={enter}>
      Enter the ship
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M3 8h9.5M8.5 3.5 13 8l-4.5 4.5" />
      </svg>
    </button>
    <p class="note">Prototype, not a medical device.</p>
  </main>

  <i class="halo" bind:this={halo} aria-hidden="true"></i>
</div>

<style>
  .landing {
    position: fixed;
    inset: 0;
    z-index: 1000;
    height: 100dvh;
    overflow: hidden;
    background: var(--bg);
    color: var(--fg);
    overscroll-behavior: contain;
    touch-action: manipulation;
    transition: opacity 520ms var(--ease-out);
  }
  .landing[data-phase='out'] {
    opacity: 0;
    pointer-events: none;
  }

  canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
  }

  canvas.hit {
    cursor: pointer;
  }

  .tip {
    position: absolute;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    pointer-events: none;
    opacity: 0;
    transition: opacity 160ms var(--ease-out);
  }
  .tip.on {
    opacity: 1;
  }
  .tip-dot {
    position: absolute;
    left: -4px;
    top: -4px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--fg);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--ui) 45%, transparent);
  }
  .tip-line {
    position: absolute;
    left: 0;
    top: 0;
    width: 46px;
    height: 1.5px;
    background: linear-gradient(90deg, var(--fg), var(--line-2));
    transform-origin: 0 50%;
    rotate: -45deg;
    scale: 0 1;
    transition: scale 220ms var(--ease-out);
  }
  .tip.on .tip-line {
    scale: 1 1;
  }
  .tip-card {
    position: absolute;
    left: 32px;
    bottom: 32px;
    display: flex;
    align-items: center;
    gap: 12px;
    width: max-content;
    max-width: 300px;
    padding: 11px 16px 11px 11px;
    border-radius: 18px;
    background: linear-gradient(180deg, var(--card-b), var(--card-a));
    box-shadow:
      inset 0 0 0 1px var(--line-2),
      var(--shadow);
    scale: 0.94;
    transform-origin: 0 100%;
    transition: scale 240ms var(--ease-spring);
  }
  .tip.on .tip-card {
    scale: 1;
  }
  .tip-txt {
    display: grid;
    gap: 2px;
  }
  .tip-txt b {
    font-family: var(--font-data);
    font-size: 10.5px;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .tip-txt span {
    font-size: 14px;
    line-height: 1.3;
  }
  .tip[data-corner='tl'] .tip-line {
    rotate: -135deg;
  }
  .tip[data-corner='tl'] .tip-card {
    left: auto;
    right: 32px;
    transform-origin: 100% 100%;
  }
  .tip[data-corner='br'] .tip-line {
    rotate: 45deg;
  }
  .tip[data-corner='br'] .tip-card {
    bottom: auto;
    top: 32px;
    transform-origin: 0 0;
  }
  .tip[data-corner='bl'] .tip-line {
    rotate: 135deg;
  }
  .tip[data-corner='bl'] .tip-card {
    inset: 32px 32px auto auto;
    transform-origin: 100% 0;
  }

  .veil {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(120% 90% at 0% 60%, color-mix(in srgb, var(--bg) 78%, transparent) 0%, transparent 62%);
  }

  .top {
    position: absolute;
    top: calc(22px + env(safe-area-inset-top, 0px));
    left: max(24px, env(safe-area-inset-left, 0px));
    display: flex;
    align-items: center;
    gap: 12px;
    animation: rise 700ms var(--ease-out) 200ms both;
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
  .name b {
    display: block;
    font-weight: 500;
    font-size: 15.5px;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }
  .name span {
    display: block;
    font-size: 12px;
    color: var(--muted);
  }

  .hero {
    position: absolute;
    left: max(24px, env(safe-area-inset-left, 0px));
    right: max(24px, env(safe-area-inset-right, 0px));
    bottom: calc(28px + env(safe-area-inset-bottom, 0px));
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
  }
  .hero > * {
    animation: rise 800ms var(--ease-out) both;
  }
  .eyebrow {
    font-family: var(--font-data);
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    animation-delay: 500ms;
  }
  h1 {
    font-size: clamp(40px, 11.5vw, 60px);
    font-weight: 500;
    letter-spacing: -0.05em;
    line-height: 1;
    text-wrap: balance;
    animation-delay: 580ms;
  }
  .sub {
    max-width: 30ch;
    font-size: 17px;
    line-height: 1.4;
    color: var(--muted);
    animation-delay: 660ms;
  }
  .btn {
    margin-top: 10px;
    animation-delay: 760ms;
  }
  .btn svg {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: translate var(--t-mid) var(--ease-out);
  }
  @media (hover: hover) {
    .btn:hover svg {
      translate: 3px 0;
    }
  }
  .note {
    font-size: 12.5px;
    color: var(--faint);
    animation-delay: 860ms;
  }

  .pin {
    position: absolute;
    top: -9px;
    left: -9px;
    width: 18px;
    height: 18px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 240ms var(--ease-out);
  }
  .pin::before,
  .pin::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    box-shadow: 0 0 0 1px var(--ui);
    animation: ping 2.8s var(--ease-out) infinite;
  }
  .pin::after {
    animation-delay: 1.4s;
  }

  .halo {
    position: absolute;
    top: 50%;
    left: 50%;
    border: 2px solid color-mix(in srgb, var(--ui) 70%, var(--fg));
    border-radius: 50%;
    box-shadow:
      0 0 46px 12px color-mix(in srgb, var(--ui) 60%, transparent),
      inset 0 0 46px 12px color-mix(in srgb, var(--ui) 40%, transparent);
    translate: -50% -50%;
    scale: 0;
    opacity: 0;
    pointer-events: none;
  }
  .landing[data-phase='opening'] {
    pointer-events: none;
  }

  .landing:not([data-phase='idle']) .top,
  .landing:not([data-phase='idle']) .hero,
  .landing:not([data-phase='idle']) .veil {
    opacity: 0;
    translate: 0 10px;
    transition:
      opacity 260ms var(--ease-out),
      translate 260ms var(--ease-out);
  }
  .landing:not([data-phase='idle']) .pin,
  .landing:not([data-phase='idle']) .tip {
    opacity: 0 !important;
  }

  @keyframes rise {
    from {
      opacity: 0;
      translate: 0 14px;
    }
  }
  @keyframes ping {
    0% {
      scale: 0.4;
      opacity: 0;
    }
    20% {
      opacity: 0.9;
    }
    80%,
    100% {
      scale: 2.4;
      opacity: 0;
    }
  }

  @media (min-aspect-ratio: 21/20) {
    .top {
      top: 32px;
      left: max(48px, env(safe-area-inset-left, 0px));
    }
    .hero {
      left: max(48px, env(safe-area-inset-left, 0px));
      right: auto;
      bottom: auto;
      top: 50%;
      translate: 0 -42%;
      max-width: 40%;
      gap: 18px;
    }
    h1 {
      font-size: clamp(44px, 5.6vw, 84px);
    }
    .sub {
      font-size: clamp(16px, 1.5vw, 20px);
    }
    .landing:not([data-phase='idle']) .hero {
      translate: 0 calc(-42% + 10px);
    }
  }

  @media (min-aspect-ratio: 21/20) and (max-height: 430px) {
    .top {
      top: 14px;
      left: max(20px, env(safe-area-inset-left, 0px));
    }
    .name span {
      display: none;
    }
    .hero {
      left: max(20px, env(safe-area-inset-left, 0px));
      top: auto;
      bottom: 14px;
      translate: none;
      gap: 8px;
      max-width: 46%;
    }
    .eyebrow {
      display: none;
    }
    h1 {
      font-size: clamp(26px, 5.4vw, 36px);
    }
    .sub {
      font-size: 14px;
    }
    .btn {
      min-height: 44px;
      margin-top: 4px;
      padding: 8px 22px;
      font-size: 15px;
    }
    .note {
      font-size: 11.5px;
    }
    .landing:not([data-phase='idle']) .hero {
      translate: 0 10px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .pin {
      display: none;
    }
  }
</style>
