<script lang="ts">
  import type { Sex } from '../../lib/figure.svelte';
  import { REGION_LABEL, STATE_LABEL } from '../../lib/labels';
  import LevelIcon from '../../lib/LevelIcon.svelte';
  import type { BodyRegion, IndicatorState } from '../../lib/types';
  import {
    EDGE_WIDTH,
    FIG_W,
    FLOOR_Y,
    HIT_WIDTH,
    ORDER,
    PIN,
    SHADE_WIDTH,
    figure,
    type RegionGeo,
    type Side,
  } from './bodyShape';

  let {
    levels,
    selected = null,
    highlight = null,
    labels = 'auto',
    sex = 'male',
    onpick,
    onhover,
  }: {
    levels: Partial<Record<BodyRegion, IndicatorState>>;
    selected?: BodyRegion | null;
    highlight?: BodyRegion | null;
    labels?: boolean | 'auto';
    sex?: Sex;
    onpick?: (region: BodyRegion) => void;
    onhover?: (region: BodyRegion | null) => void;
  } = $props();

  const FLAGGED: IndicatorState[] = ['self_care', 'tell_cmo', 'flight_surgeon'];
  const SIDES: Side[] = ['front', 'back'];
  const GEO = $derived({ front: figure('front', sex), back: figure('back', sex) });
  const TOP = 6;
  const H = 492;
  const GLOW = 14;
  const LABEL_MIN_WIDTH = 540;

  let width = $state(0);
  let root = $state<HTMLDivElement>();
  let hot = $state<BodyRegion | null>(null);

  const withLabels = $derived(labels === 'auto' ? width >= LABEL_MIN_WIDTH : labels);
  const margin = $derived(withLabels ? 124 : 6);
  const gap = $derived(withLabels ? 28 : 14);
  const W = $derived(2 * margin + 2 * FIG_W + gap);
  const offset = $derived<Record<Side, number>>({ front: margin, back: margin + FIG_W + gap });
  const active = $derived(highlight ?? hot);
  const solo = $derived(withLabels || !onpick ? null : (active ?? selected));

  const levelOf = (z: BodyRegion): IndicatorState => levels[z] ?? 'not_enough_data';
  const isFlag = (z: BodyRegion) => FLAGGED.includes(levelOf(z));
  const pct = (value: number, of: number) => `${((value / of) * 100).toFixed(3)}%`;

  const halos = $derived(
    SIDES.flatMap((side) =>
      ORDER.filter((z) => isFlag(z)).flatMap((z) =>
        (GEO[side][z]?.parts ?? []).map((b, k) => ({
          key: `${side}-${z}-${k}`,
          lv: levelOf(z),
          left: pct(offset[side] + b.x - GLOW, W),
          top: pct(TOP + b.y - GLOW, H),
          width: pct(b.w + 2 * GLOW, W),
          height: pct(b.h + 2 * GLOW, H),
        })),
      ),
    ),
  );

  const pins = $derived(
    withLabels
      ? ORDER.map((z, i) => {
          const pin = PIN[sex][z];
          const right = pin.side === 'back';
          const ax = offset[pin.side] + pin.x;
          const ay = TOP + pin.y;
          const ex = right ? offset.back + FIG_W - 2 : offset.front + 2;
          const lv = levelOf(z);
          return {
            z,
            lv,
            key: `${z}-${lv}`,
            i,
            right,
            flag: isFlag(z),
            on: z === selected || z === active,
            ax,
            ay,
            row: TOP + pin.row,
            line: `M${right ? W : 0} ${TOP + pin.row}H${ex}L${ax} ${ay}`,
          };
        })
      : [],
  );

  let previous: Partial<Record<BodyRegion, IndicatorState>> | null = null;
  $effect(() => {
    const now = { ...levels };
    const before = previous;
    previous = now;
    if (!before || !root) return;
    for (const z of Object.keys(now) as BodyRegion[]) {
      if (now[z] === before[z] || !FLAGGED.includes(now[z] ?? 'ok')) continue;
      root.querySelectorAll<SVGGElement>(`.rg[data-rg="${z}"]`).forEach((g) => {
        g.classList.remove('chg');
        void g.getBoundingClientRect();
        g.classList.add('chg');
      });
    }
  });

  function enter(z: BodyRegion) {
    hot = z;
    onhover?.(z);
  }

  function leave(z: BodyRegion) {
    if (hot !== z) return;
    hot = null;
    onhover?.(null);
  }

  function key(e: KeyboardEvent, z: BodyRegion) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    onpick?.(z);
  }
</script>

<div class="fig" bind:clientWidth={width}>
  <div
    class="in"
    class:labels={withLabels}
    class:live={!!onpick}
    bind:this={root}
  >
    <div class="halos" aria-hidden="true">
      {#each halos as h (h.key)}
        <i
          class="halo"
          data-lv={h.lv}
          style:left={h.left}
          style:top={h.top}
          style:width={h.width}
          style:height={h.height}
        ></i>
      {/each}
    </div>

    <svg
      viewBox="0 0 {W} {H}"
      role={onpick ? 'group' : 'img'}
      aria-label={onpick
        ? `${sex === 'female' ? 'Female' : 'Male'} body figure, front and back. Each region shows its level. Select a region for its symptoms and indicators.`
        : `${sex === 'female' ? 'Female' : 'Male'} body figure, front and back. Only a flagged region takes a colour.`}
    >
      {#each SIDES as side (side)}
        <g transform="translate({offset[side]},{TOP})">
          <ellipse class="floor" cx={FIG_W / 2} cy={FLOOR_Y} rx="74" ry="10.5" />
          <ellipse class="floor ring" cx={FIG_W / 2} cy={FLOOR_Y} rx="50" ry="7" />
          {#each ORDER as z (`${sex}-${z}`)}
            {@const geo = GEO[side][z]}
            {#if geo}
              {@const lv = levelOf(z)}
              {#if onpick}
                <g
                  class="rg"
                  class:flag={isFlag(z)}
                  class:hl={active === z}
                  data-rg={z}
                  data-lv={lv}
                  style:--top={Math.round(geo.top)}
                  role="button"
                  tabindex={side === 'back' && z !== 'back' ? -1 : 0}
                  aria-pressed={selected === z}
                  aria-label="{REGION_LABEL[z]}: {STATE_LABEL[lv]}. Open the region."
                  onclick={() => onpick(z)}
                  onkeydown={(e) => key(e, z)}
                  onpointerenter={() => enter(z)}
                  onpointerleave={() => leave(z)}
                  onfocus={() => enter(z)}
                  onblur={() => leave(z)}
                >
                  {@render dots(geo)}
                </g>
              {:else}
                <g
                  class="rg static"
                  class:flag={isFlag(z)}
                  class:hl={active === z}
                  data-rg={z}
                  data-lv={lv}
                  style:--top={Math.round(geo.top)}
                >
                  {@render dots(geo)}
                </g>
              {/if}
            {/if}
          {/each}
        </g>
      {/each}
      <g class="pins" aria-hidden="true">
        {#each pins as pin (pin.key)}
          <g
            class="pin"
            class:flag={pin.flag}
            class:on={pin.on}
            data-lv={pin.lv}
            style:--i={pin.i}
          >
            <path class="lead" d={pin.line} pathLength="1" />
            <circle class="ring" cx={pin.ax} cy={pin.ay} r="6.5" />
            <circle class="core" cx={pin.ax} cy={pin.ay} r="2.8" />
          </g>
        {/each}
      </g>
    </svg>

    {#if withLabels}
      <div class="cos" aria-hidden="true">
        {#each pins as pin (pin.key)}
          <button
            type="button"
            class="co"
            class:right={pin.right}
            class:flag={pin.flag}
            class:on={pin.on}
            class:sel={selected === pin.z}
            data-lv={pin.lv}
            style:top={pct(pin.row, H)}
            style:--i={pin.i}
            tabindex="-1"
            disabled={!onpick}
            onclick={() => onpick?.(pin.z)}
            onpointerenter={() => enter(pin.z)}
            onpointerleave={() => leave(pin.z)}
          >
            {@render tag(pin.z, pin.lv)}
          </button>
        {/each}
      </div>
    {:else if solo}
      {@const lv = levelOf(solo)}
      <span
        class="co solo on"
        class:flag={isFlag(solo)}
        class:sel={selected === solo}
        data-lv={lv}
        style:top={pct(TOP + 36, H)}
        aria-hidden="true"
      >
        {@render tag(solo, lv)}
      </span>
    {/if}

    {#each SIDES as side (side)}
      <span
        class="cap"
        aria-hidden="true"
        style:left={pct(offset[side] + FIG_W / 2, W)}
        style:top={pct(TOP + FLOOR_Y + 28, H)}
      >
        {side}
      </span>
    {/each}

    {#if onpick}
      <i class="scan" aria-hidden="true"></i>
    {/if}
  </div>
</div>

{#snippet tag(z: BodyRegion, lv: IndicatorState)}
  <span class="co-n"><LevelIcon state={lv} size={9} />{REGION_LABEL[z]}</span>
  <span class="co-l">{STATE_LABEL[lv]}</span>
{/snippet}

{#snippet dots(geo: RegionGeo)}
  <path class="hit" stroke-width={HIT_WIDTH} d={geo.hit} />
  {#each geo.shades as d, k (k)}
    {#if d}
      <path class="d b{k}" stroke-width={SHADE_WIDTH[k]} {d} />
    {/if}
  {/each}
  <path class="edge" stroke-width={EDGE_WIDTH} d={geo.edge} />
{/snippet}

<style>
  .fig {
    min-width: 0;
  }
  .in {
    position: relative;
    max-width: 350px;
    margin-inline: auto;
    --body: color-mix(in srgb, var(--dot-2) 64%, var(--fg));
    --step: 1ms;
  }
  .in.labels {
    max-width: none;
  }
  .in.live {
    --step: 2.1ms;
  }
  svg {
    position: relative;
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
  }

  .floor {
    fill: color-mix(in srgb, var(--fg) 3.5%, transparent);
    stroke: var(--line-2);
    stroke-width: 1;
  }
  .floor.ring {
    fill: none;
    stroke: var(--line-2);
    stroke-dasharray: 0.1 4.4;
    stroke-linecap: round;
    stroke-width: 1.5;
  }

  .rg {
    cursor: pointer;
    outline: none;
    animation: rg-in 460ms var(--ease-out) backwards;
    animation-delay: calc(60ms + var(--top, 0) * var(--step));
  }
  .rg.static {
    cursor: inherit;
  }
  .d,
  .edge,
  .hit {
    fill: none;
    stroke-linecap: round;
  }
  .hit {
    stroke: transparent;
    pointer-events: stroke;
  }
  .rg.static .hit {
    pointer-events: none;
  }
  .d {
    stroke: var(--body);
    pointer-events: none;
    transition: stroke var(--t-mid) var(--ease-out);
  }
  .b0 {
    opacity: 0.22;
  }
  .b1 {
    opacity: 0.32;
  }
  .b2 {
    opacity: 0.47;
  }
  .b3 {
    opacity: 0.63;
  }
  .b4 {
    opacity: 0.81;
  }
  .rg[data-rg='eyes'] .d {
    stroke: var(--fg);
  }
  .rg.flag {
    filter: url(#glow);
  }
  .rg.flag .d {
    stroke: var(--lc);
  }
  .rg.flag .b0 {
    opacity: 0.46;
  }
  .rg.flag .b1 {
    opacity: 0.56;
  }
  .rg.flag .b2 {
    opacity: 0.67;
  }
  .rg.flag .b3 {
    opacity: 0.78;
  }
  .rg.flag .b4 {
    opacity: 0.9;
  }
  .rg:hover .d,
  .rg.hl .d,
  .rg[aria-pressed='true'] .d {
    stroke: color-mix(in srgb, var(--body) 40%, var(--fg));
  }
  .rg.flag:hover .d,
  .rg.flag.hl .d,
  .rg.flag[aria-pressed='true'] .d {
    stroke: color-mix(in srgb, var(--lc) 78%, var(--fg));
  }
  .edge {
    stroke: var(--fg);
    opacity: 0;
    pointer-events: none;
    transition:
      opacity var(--t-mid) var(--ease-out),
      stroke var(--t-mid) var(--ease-out);
  }
  .rg:hover .edge,
  .rg.hl .edge {
    opacity: 0.55;
  }
  .rg[aria-pressed='true'] .edge {
    opacity: 1;
  }
  .rg:focus-visible .edge {
    stroke: var(--ui);
    stroke-width: 3.4px;
    opacity: 1;
  }
  .rg:global(.chg) {
    transform-box: fill-box;
    transform-origin: 50% 50%;
    animation: flag-pulse 300ms var(--ease-spring);
  }

  .halos,
  .cos {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .halos {
    animation: fade-in 700ms var(--ease-out) 500ms backwards;
  }
  .halo {
    position: absolute;
    border-radius: 50%;
    background: radial-gradient(
      ellipse closest-side,
      color-mix(in srgb, var(--lc) 34%, transparent),
      color-mix(in srgb, var(--lc) 12%, transparent) 55%,
      transparent
    );
    will-change: opacity, transform;
    animation: breathe 2800ms ease-in-out infinite;
  }

  .pins {
    pointer-events: none;
  }
  .pin {
    animation: fade-in 320ms var(--ease-out) backwards;
    animation-delay: calc(520ms + var(--i, 0) * 45ms);
  }
  .lead {
    fill: none;
    stroke: var(--line);
    stroke-width: 1.1;
    transition: stroke var(--t-mid) var(--ease-out);
  }
  .core {
    fill: var(--faint);
    transform-box: fill-box;
    transform-origin: 50% 50%;
    scale: 0.6;
    transition:
      fill var(--t-mid) var(--ease-out),
      scale var(--t-mid) var(--ease-spring);
  }
  .ring {
    fill: color-mix(in srgb, var(--lc) 22%, transparent);
    stroke: color-mix(in srgb, var(--fg) 70%, transparent);
    stroke-width: 1;
    opacity: 0;
    transform-box: fill-box;
    transform-origin: 50% 50%;
    scale: 0.5;
    transition:
      opacity var(--t-mid) var(--ease-out),
      scale var(--t-mid) var(--ease-spring);
  }
  .pin.on .lead {
    stroke: var(--line-2);
  }
  .pin.flag .lead {
    stroke: color-mix(in srgb, var(--lc) 50%, var(--line-2));
    stroke-dasharray: 1;
    animation: draw 420ms var(--ease-out) backwards;
    animation-delay: calc(560ms + var(--i, 0) * 45ms);
  }
  .pin.flag .core,
  .pin.on .core {
    fill: var(--fg);
    scale: 1;
  }
  .pin.flag .ring,
  .pin.on .ring {
    opacity: 1;
    scale: 1;
  }

  .co {
    position: absolute;
    left: 0;
    display: grid;
    gap: 2px;
    justify-items: start;
    padding: 5px 10px 6px 9px;
    border: 0;
    border-radius: 12px;
    background: var(--fig-bg, transparent);
    color: var(--muted);
    font-size: 13px;
    line-height: 1.2;
    text-align: left;
    white-space: nowrap;
    cursor: pointer;
    pointer-events: auto;
    translate: 0 -50%;
    transition:
      color var(--t-fast) var(--ease-out),
      background-color var(--t-fast) var(--ease-out),
      box-shadow var(--t-fast) var(--ease-out);
    animation: rise-in 300ms var(--ease-out) backwards;
    animation-delay: calc(480ms + var(--i, 0) * 45ms);
  }
  .co.right {
    left: auto;
    right: 0;
    justify-items: end;
  }
  .co.solo {
    left: 50%;
    translate: -50% -50%;
    pointer-events: none;
    animation: none;
  }
  .co:hover,
  .co.on {
    color: var(--fg);
    background: var(--well-2);
    box-shadow: inset 0 0 0 1px var(--line-2);
  }
  .co.flag {
    color: var(--fg);
    background: color-mix(in srgb, var(--lc) 10%, var(--well));
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--lc) 26%, var(--line));
  }
  .co.flag:hover,
  .co.flag.on {
    background: color-mix(in srgb, var(--lc) 18%, var(--well-2));
  }
  .co.sel,
  .co.flag.sel {
    box-shadow: inset 0 0 0 1.5px var(--fg);
  }
  .co[disabled] {
    cursor: default;
  }
  .co-n {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-weight: 500;
  }
  .co-n :global(.lvicon) {
    color: var(--lc);
  }
  .co-l {
    font-size: 11.5px;
    color: var(--lc);
  }
  .co:not(.right) .co-l {
    padding-left: 16px;
  }
  .co:not(.flag, .on, :hover) .co-l,
  .co:not(.flag, .on, :hover) .co-n :global(.lvicon) {
    opacity: 0.7;
  }

  .cap {
    position: absolute;
    translate: -50% -50%;
    font-family: var(--font-data);
    font-size: 10px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--faint);
    pointer-events: none;
  }

  .scan {
    position: absolute;
    inset: 0 5%;
    overflow: hidden;
    pointer-events: none;
    mask-image: linear-gradient(90deg, transparent, #000 22%, #000 78%, transparent);
  }
  .scan::before {
    content: '';
    position: absolute;
    inset: 0;
    border-bottom: 1px solid color-mix(in srgb, var(--ui) 85%, transparent);
    background: linear-gradient(
      180deg,
      transparent calc(100% - 72px),
      color-mix(in srgb, var(--ui) 18%, transparent)
    );
    animation: scan 1300ms cubic-bezier(0.45, 0, 0.4, 1) 60ms both;
  }

  @keyframes rg-in {
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
  @keyframes breathe {
    0%,
    100% {
      opacity: 0.4;
      transform: scale(0.95);
    }
    50% {
      opacity: 1;
      transform: scale(1.05);
    }
  }
  @keyframes scan {
    0% {
      transform: translateY(-100%);
      opacity: 0;
    }
    10% {
      opacity: 1;
    }
    80% {
      opacity: 1;
    }
    100% {
      transform: translateY(0);
      opacity: 0;
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
  @media (prefers-reduced-motion: reduce) {
    .halo {
      animation: none;
      opacity: 0.75;
    }
    .scan {
      display: none;
    }
  }
</style>
