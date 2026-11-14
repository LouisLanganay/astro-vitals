<script lang="ts">
  import { REGION_LABEL, STATE_LABEL } from '../../lib/labels';
  import type { BodyRegion, IndicatorState } from '../../lib/types';
  import {
    CORE_RANK,
    DOT_STROKE,
    DRAW_ORDER,
    PIN,
    figDots,
    shapesOf,
    type Shape,
    type Side,
  } from './bodyShape';

  let {
    levels,
    selected = null,
    highlight = null,
    labels = 'auto',
    onpick,
  }: {
    levels: Partial<Record<BodyRegion, IndicatorState>>;
    selected?: BodyRegion | null;
    highlight?: BodyRegion | null;
    labels?: boolean | 'auto';
    onpick?: (region: BodyRegion) => void;
  } = $props();

  const FLAGGED: IndicatorState[] = ['self_care', 'tell_cmo', 'flight_surgeon'];
  const SIDES: Side[] = ['front', 'back'];
  const DOTS = { front: figDots('front'), back: figDots('back') };

  let width = $state(0);
  let svg = $state<SVGSVGElement>();

  const withLabels = $derived(labels === 'auto' ? width >= 470 : labels);
  const W = $derived(withLabels ? 664 : 432);
  const offset = $derived<Record<Side, number>>(
    withLabels ? { front: 128, back: 360 } : { front: 8, back: 224 },
  );

  const levelOf = (z: BodyRegion): IndicatorState => levels[z] ?? 'not_enough_data';
  const isFlag = (z: BodyRegion) => FLAGGED.includes(levelOf(z));

  const pins = $derived(
    withLabels
      ? (Object.keys(PIN) as BodyRegion[])
          .filter((z) => isFlag(z) || z === selected)
          .map((z) => {
            const [x, y, row] = PIN[z];
            const back = z === 'back';
            const ax = (back ? offset.back : offset.front) + x;
            const ay = 4 + y;
            const lx = back ? 576 : 108;
            const ex = back ? offset.back + 206 : offset.front - 8;
            return {
              z,
              lv: levelOf(z),
              ax,
              ay,
              lx,
              row,
              anchor: back ? 'start' : 'end',
              points: `${back ? lx - 6 : lx + 6},${row} ${ex},${row} ${ax},${ay}`,
            };
          })
      : [],
  );

  let previous: Partial<Record<BodyRegion, IndicatorState>> | null = null;
  $effect(() => {
    const now = { ...levels };
    const before = previous;
    previous = now;
    if (!before || !svg) return;
    for (const z of Object.keys(now) as BodyRegion[]) {
      if (now[z] === before[z] || !FLAGGED.includes(now[z] ?? 'ok')) continue;
      svg.querySelectorAll<SVGGElement>(`.rg[data-rg="${z}"]`).forEach((g) => {
        g.classList.remove('chg');
        void g.getBoundingClientRect();
        g.classList.add('chg');
      });
    }
  });

  function key(e: KeyboardEvent, z: BodyRegion) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    onpick?.(z);
  }
</script>

<div class="fig" bind:clientWidth={width}>
  <svg
    bind:this={svg}
    viewBox="0 0 {W} 480"
    role={onpick ? 'group' : 'img'}
    aria-label={onpick
      ? 'Body figure, front and back. Each region shows its level. Select a region for its symptoms and indicators.'
      : 'Body figure, front and back. Only a flagged region takes a colour.'}
  >
    {#each SIDES as side (side)}
      <g transform="translate({offset[side]},4)">
        {#each DRAW_ORDER as z (z)}
          {@const dots = DOTS[side][z]}
          {@const shapes = shapesOf(z, side)}
          {#if dots && shapes.length}
            {@const lv = levelOf(z)}
            {#if onpick}
              <g
                class="rg"
                class:flag={isFlag(z)}
                class:hl={highlight === z}
                data-rg={z}
                data-lv={lv}
                style:--r={CORE_RANK[z]}
                role="button"
                tabindex={side === 'back' && z !== 'back' ? -1 : 0}
                aria-pressed={selected === z}
                aria-label="{REGION_LABEL[z]}: {STATE_LABEL[lv]}. Open the region."
                onclick={() => onpick(z)}
                onkeydown={(e) => key(e, z)}
              >
                {@render body(shapes, dots)}
              </g>
            {:else}
              <g
                class="rg static"
                class:flag={isFlag(z)}
                class:hl={highlight === z}
                data-rg={z}
                data-lv={lv}
                style:--r={CORE_RANK[z]}
              >
                {@render body(shapes, dots)}
              </g>
            {/if}
          {/if}
        {/each}
        <text class="figcap" x="100" y="472" text-anchor="middle">{side.toUpperCase()}</text>
      </g>
    {/each}
    <g class="pins" aria-hidden="true">
      {#each pins as pin (pin.z + pin.lv + pin.points)}
        <g class="pin" data-lv={pin.lv}>
          <polyline points={pin.points} pathLength="1" />
          <circle cx={pin.ax} cy={pin.ay} r="3.2" />
          <text class="pn" x={pin.lx} y={pin.row - 3} text-anchor={pin.anchor}>
            {REGION_LABEL[pin.z]}
          </text>
          <text class="pl" x={pin.lx} y={pin.row + 13} text-anchor={pin.anchor}>
            {STATE_LABEL[pin.lv]}
          </text>
        </g>
      {/each}
    </g>
  </svg>
</div>

{#snippet body(shapes: Shape[], dots: [string, string, string])}
  {#each shapes as s, k (k)}
    {#if s.t === 'e'}
      <ellipse class="hit" cx={s.cx} cy={s.cy} rx={s.rx + 3} ry={s.ry + 3} />
    {:else if s.t === 'r'}
      <rect class="hit" x={s.x - 2} y={s.y - 3} width={s.w + 4} height={s.h + 6} />
    {:else if s.t === 'c'}
      <line
        class="hit"
        x1={s.x1}
        y1={s.y1}
        x2={s.x2}
        y2={s.y2}
        stroke-width={2 * s.r + 6}
        stroke-linecap="round"
      />
    {:else}
      <polygon class="hit" points={s.pts.map((q) => q.join(',')).join(' ')} />
    {/if}
  {/each}
  {#each dots as d, k (k)}
    {#if d}
      <path class="d b{k}" style:--k={2 - k} stroke-width={DOT_STROKE} {d} />
    {/if}
  {/each}
{/snippet}

<style>
  .fig {
    min-width: 0;
  }
  svg {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
  }
  .rg {
    cursor: pointer;
    outline: none;
  }
  .rg.static {
    cursor: inherit;
  }
  .d {
    fill: none;
    stroke: var(--dot);
    stroke-linecap: round;
    transition: stroke var(--t-mid) var(--ease-out);
    animation: dot-in 240ms var(--ease-out) backwards;
    animation-delay: calc(var(--r, 0) * 30ms + var(--k, 0) * 60ms);
  }
  .b1 {
    opacity: 0.86;
  }
  .b0 {
    opacity: 0.6;
  }
  .rg[data-rg='eyes'] .d {
    stroke: var(--dot-2);
  }
  .rg.flag .d {
    stroke: var(--lc);
  }
  .rg.flag {
    filter: url(#glow);
  }
  .rg:hover .d,
  .rg.hl .d {
    stroke: var(--dot-2);
  }
  .rg[data-rg='eyes']:hover .d,
  .rg[data-rg='eyes'].hl .d {
    stroke: var(--fg);
  }
  .rg.flag:hover .d,
  .rg.flag.hl .d {
    stroke: color-mix(in srgb, var(--lc) 75%, var(--fg));
  }
  .rg[aria-pressed='true'] .d {
    stroke: var(--fg);
  }
  .rg.flag[aria-pressed='true'] .d {
    stroke: color-mix(in srgb, var(--lc) 70%, var(--fg));
  }
  .rg:focus-visible .d {
    stroke: var(--ui);
  }
  .hit {
    fill: transparent;
    stroke: transparent;
  }
  .rg.static .hit {
    pointer-events: none;
  }
  .rg:global(.chg) {
    transform-box: fill-box;
    transform-origin: 50% 50%;
    animation: flag-pulse 300ms var(--ease-spring);
  }
  .figcap {
    font-family: var(--font-data);
    font-size: 10px;
    letter-spacing: 0.14em;
    fill: var(--faint);
  }
  .pin polyline {
    stroke: var(--line-2);
    stroke-width: 1;
    fill: none;
    stroke-dasharray: 1;
    animation: draw 280ms var(--ease-out) backwards;
  }
  .pin circle {
    fill: var(--lc);
    transform-box: fill-box;
    transform-origin: 50% 50%;
    animation: pop-in 220ms var(--ease-spring) backwards;
  }
  .pin text {
    animation: fade-in 200ms var(--ease-out) 120ms backwards;
  }
  .pn {
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 500;
    fill: var(--fg);
  }
  .pl {
    font-family: var(--font-body);
    font-size: 12px;
    fill: var(--lc);
  }
  @keyframes dot-in {
    from {
      opacity: 0;
    }
  }
  @keyframes draw {
    from {
      stroke-dashoffset: 1;
    }
    to {
      stroke-dashoffset: 0;
    }
  }
  @keyframes flag-pulse {
    0% {
      opacity: 0.35;
      transform: scale(0.97);
    }
    55% {
      opacity: 1;
      transform: scale(1.04);
    }
    100% {
      transform: none;
    }
  }
</style>
