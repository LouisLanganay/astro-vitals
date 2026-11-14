<script lang="ts">
  import { onMount } from 'svelte';
  import { prefersReducedMotion } from 'svelte/motion';

  import { createScene, type Scene } from './scene';

  let {
    oncovered,
    ondone,
  }: {
    oncovered: (reveal: () => void) => void;
    ondone: () => void;
  } = $props();

  const COVER_MS = 340;
  const OUT_MS = 520;

  let canvas = $state<HTMLCanvasElement>();
  let pin = $state<HTMLElement>();
  let cta = $state<HTMLButtonElement>();
  let hero = $state<HTMLElement>();
  let phase = $state<'idle' | 'leaving' | 'covered' | 'out'>('idle');
  let scene: Scene | null = null;

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  function anchor(x: number, y: number, alpha: number) {
    if (!pin) return;
    pin.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
    pin.style.opacity = alpha.toFixed(3);
  }

  function frame(wide: boolean) {
    const box = hero?.getBoundingClientRect();
    if (!box) return null;
    const side = Math.max(0.34, Math.min(0.5, (box.right + 36) / window.innerWidth));
    const floor = Math.max(0.4, Math.min(0.68, (box.top - 30) / window.innerHeight));
    return wide ? [side, 0.07, 1.04, 0.93] : [0.05, 0.1, 1.16, floor];
  }

  onMount(() => {
    scene = createScene(canvas!, { reduced: prefersReducedMotion.current, frame, onanchor: anchor });
    const observer = new ResizeObserver(() => phase === 'idle' && scene?.refit());
    observer.observe(hero!);
    return () => {
      observer.disconnect();
      scene?.destroy();
    };
  });

  async function enter() {
    if (phase === 'leaving') {
      scene?.skip();
      return;
    }
    if (phase !== 'idle') return;
    phase = 'leaving';
    await scene?.enter();
    phase = 'covered';
    await wait(prefersReducedMotion.current ? 0 : COVER_MS);
    oncovered(reveal);
  }

  function reveal() {
    phase = 'out';
    setTimeout(ondone, prefersReducedMotion.current ? 0 : OUT_MS);
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
  <canvas bind:this={canvas} aria-hidden="true"></canvas>
  <div class="veil" aria-hidden="true"></div>

  <i class="pin" bind:this={pin} aria-hidden="true"></i>

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

  <div class="cover" aria-hidden="true"></div>
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

  .cover {
    position: absolute;
    inset: 0;
    background: var(--bg);
    opacity: 0;
    pointer-events: none;
    transition: opacity 340ms ease-in;
  }
  .landing[data-phase='covered'] .cover,
  .landing[data-phase='out'] .cover {
    opacity: 1;
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
  .landing:not([data-phase='idle']) .pin {
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
