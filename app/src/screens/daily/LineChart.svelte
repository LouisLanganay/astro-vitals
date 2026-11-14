<script lang="ts">
  import type { IndicatorState, Level, SeriesPoint } from '../../lib/types';

  let {
    points,
    baseline,
    label,
    state: level = 'not_enough_data',
    weekly = false,
    thresholds = [],
    minSpan = 1,
    until = null,
    format = (v: number) => String(v),
  }: {
    points: SeriesPoint[];
    baseline: number | null;
    label: string;
    state?: IndicatorState;
    weekly?: boolean;
    thresholds?: { value: number; level: Level }[];
    minSpan?: number;
    until?: number | null;
    format?: (v: number) => string;
  } = $props();

  let width = $state(520);
  const H = $derived(width < 420 ? 150 : 184);
  let pick = $state<number | null>(null);
  let svgEl = $state<SVGSVGElement>();
  let clearTimer: ReturnType<typeof setTimeout> | undefined;
  const L = 36;
  const R = 10;
  const T = 12;
  const B = 24;

  const fmt = (v: number, d: number) =>
    v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

  const chart = $derived.by(() => {
    if (points.length === 0) return null;
    const W = Math.max(260, Math.round(width));
    const vals = points.flatMap((p) => (p.value === null ? [] : [p.value]));
    const means = weekly ? [] : points.flatMap((p) => (p.mean_7d === null ? [] : [p.mean_7d]));
    if (vals.length === 0 && means.length === 0) return null;
    const all = [...vals, ...means, ...thresholds.map((t) => t.value)];
    if (baseline !== null) all.push(baseline);
    let lo = Math.min(...all);
    let hi = Math.max(...all);
    if (hi - lo < minSpan) {
      const mid = (hi + lo) / 2;
      lo = mid - minSpan / 2;
      hi = mid + minSpan / 2;
    }
    const pad = (hi - lo) * 0.12;
    hi += pad;
    lo = lo >= 0 ? Math.max(0, lo - pad) : lo - pad;

    const first = points[0].mission_day;
    const last = Math.max(points[points.length - 1].mission_day, until ?? -Infinity);
    const n = last - first + 1;
    const sw = (W - L - R) / n;
    const X = (d: number) => L + (d - first + 0.5) * sw;
    const Y = (v: number) => T + ((hi - v) / (hi - lo)) * (H - T - B);
    const y0 = H - B;

    const bars = weekly
      ? []
      : points.flatMap((p) => {
          if (p.value === null) return [];
          const y = Math.min(Y(p.value), y0 - 1);
          return [{ x: X(p.mission_day), y, h: Math.max(1, y0 - y) }];
        });
    const bw = Math.max(1.2, sw * 0.64);

    const trace = (key: 'value' | 'mean_7d') => {
      let d = '';
      let pen = false;
      for (const p of points) {
        const v = p[key];
        if (v === null) {
          if (!weekly) pen = false;
          continue;
        }
        d += `${pen ? 'L' : 'M'}${X(p.mission_day).toFixed(1)},${Y(v).toFixed(1)}`;
        pen = true;
      }
      return d;
    };

    const dots = weekly
      ? points.flatMap((p) => (p.value === null ? [] : [{ x: X(p.mission_day), y: Y(p.value) }]))
      : [];

    let end: { x: number; y: number } | null = null;
    for (let k = points.length - 1; k >= 0; k--) {
      const v = weekly ? points[k].value : points[k].mean_7d;
      if (v !== null) {
        end = { x: X(points[k].mission_day), y: Y(v) };
        break;
      }
    }

    const span = n;
    let ticks: number[];
    if (span > 60) ticks = [0, 30, 60, 90, 120].filter((d) => d >= first && d <= last);
    else {
      const stepDays = span <= 15 ? 3 : 7;
      ticks = [];
      for (let d = last; d >= first; d -= stepDays) ticks.push(d);
    }
    const decimals = hi - lo < 4 ? 1 : 0;

    return {
      W,
      bars,
      bw,
      y0,
      line: weekly ? trace('value') : trace('mean_7d'),
      dots,
      end,
      ticks: ticks.map((d) => ({ d, x: X(d) })),
      grid: [lo, (lo + hi) / 2, hi].map((v) => ({ y: Y(v), text: fmt(v, decimals) })),
      pre: first < 0 ? { w: Math.max(0, X(Math.min(-0.5, last + 0.5)) - L) } : null,
      preLabel: first < 0 && span > 60 ? (L + X(-0.5)) / 2 : null,
      baselineY: baseline === null ? null : Y(baseline),
      thr: thresholds.map((t) => ({ y: Y(t.value), level: t.level })),
      n: bars.length,
      first,
      last,
      sw,
      X,
      Y,
    };
  });

  const byDay = $derived(new Map(points.map((p) => [p.mission_day, p])));

  const cursor = $derived.by(() => {
    if (!chart || pick === null) return null;
    const p = byDay.get(pick);
    const v = p ? (weekly ? p.value : (p.mean_7d ?? p.value)) : null;
    const x = chart.X(pick);
    const lines = p?.value != null ? [format(p.value)] : ['No data'];
    if (!weekly && p?.mean_7d != null) lines.push(`${MEAN} ${format(p.mean_7d)}`);
    return {
      x,
      y: v === null ? null : chart.Y(v),
      day: pick,
      lines,
      flip: x > chart.W * 0.62,
    };
  });

  const MEAN = '7-day mean';

  function dayAt(e: PointerEvent) {
    if (!chart || !svgEl) return null;
    const r = svgEl.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * chart.W;
    const d = chart.first + Math.floor((x - L) / chart.sw);
    return Math.max(chart.first, Math.min(chart.last, d));
  }

  let viaPointer = $state(false);

  function move(e: PointerEvent) {
    if (e.type === 'pointerdown') viaPointer = true;
    const d = dayAt(e);
    if (d === null) return;
    clearTimeout(clearTimer);
    pick = d;
  }

  function leave(e: PointerEvent) {
    if (e.pointerType === 'mouse') pick = null;
    else {
      clearTimeout(clearTimer);
      clearTimer = setTimeout(() => (pick = null), 2600);
    }
  }

  function key(e: KeyboardEvent) {
    viaPointer = false;
    if (!chart) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Escape') return;
    e.preventDefault();
    if (e.key === 'Escape') {
      pick = null;
      return;
    }
    const step = e.key === 'ArrowLeft' ? -1 : 1;
    const start = pick ?? chart.last;
    pick = Math.max(chart.first, Math.min(chart.last, start + (pick === null ? 0 : step)));
  }
</script>

<div class="plot" bind:clientWidth={width}>
  {#if chart}
    <svg
      bind:this={svgEl}
      class:ptr={viaPointer}
      viewBox="0 0 {chart.W} {H}"
      role="slider"
      tabindex="0"
      aria-label="{label}: {weekly ? 'weekly values' : 'daily values, 7-day mean'} and baseline median"
      aria-valuemin={chart.first}
      aria-valuemax={chart.last}
      aria-valuenow={pick ?? chart.last}
      aria-valuetext={cursor ? `Day ${cursor.day}: ${cursor.lines.join(', ')}` : 'Use the arrow keys to read the value of each day.'}
      onpointerdown={move}
      onpointermove={move}
      onpointerleave={leave}
      onpointercancel={leave}
      onkeydown={key}
      onblur={() => (pick = null)}
    >
      {#if chart.pre}
        <rect class="pre" x={L} y={T} width={chart.pre.w} height={chart.y0 - T} rx="4" />
      {/if}
      {#each chart.grid as g, i (i)}
        <line class="gl" x1={L} x2={chart.W - R} y1={g.y} y2={g.y} />
        <text x={L - 7} y={g.y + 3.5} text-anchor="end">{g.text}</text>
      {/each}
      {#each chart.ticks as t (t.d)}
        <text x={t.x} y={H - 6} text-anchor={t.x > chart.W - 22 ? 'end' : 'middle'}>{t.d}</text>
      {/each}
      {#if chart.preLabel !== null}
        <text x={chart.preLabel} y={H - 6} text-anchor="middle">pre</text>
      {/if}
      <g class="bars">
        {#each chart.bars as b, i (i)}
          <rect
            x={b.x - chart.bw / 2}
            y={b.y}
            width={chart.bw}
            height={b.h}
            rx={Math.min(2, chart.bw / 2)}
            fill="url(#g-bar)"
            style:--k={chart.n > 1 ? i / (chart.n - 1) : 0}
          />
        {/each}
      </g>
      {#each chart.thr as t, i (i)}
        <line class="thr" data-lv={t.level} x1={L} x2={chart.W - R} y1={t.y} y2={t.y} />
      {/each}
      {#if chart.baselineY !== null}
        <line class="med" x1={L} x2={chart.W - R} y1={chart.baselineY} y2={chart.baselineY} />
      {/if}
      {#if chart.line}
        <path class={weekly ? 'wk' : 'm7'} pathLength="1" d={chart.line} />
      {/if}
      {#each chart.dots as d, i (i)}
        <circle class="dot" cx={d.x} cy={d.y} r="3" style:--k={i} />
      {/each}
      {#if chart.end}
        <g class="end" class:dim={cursor !== null} data-lv={level}>
          <circle class="halo" cx={chart.end.x} cy={chart.end.y} r="10" />
          <circle class="core" cx={chart.end.x} cy={chart.end.y} r="4.6" />
        </g>
      {/if}
      {#if cursor}
        <g class="cur" style:transform="translateX({cursor.x}px)">
          <line x1="0" x2="0" y1={T} y2={chart.y0} />
          {#if cursor.y !== null}
            <circle class="cdot" cx="0" cy={cursor.y} r="4.2" />
          {/if}
        </g>
      {/if}
    </svg>
    {#if cursor}
      <div
        class="tip"
        class:flip={cursor.flip}
        style:left="{(cursor.x / chart.W) * 100}%"
        aria-hidden="true"
      >
        <b>Day {cursor.day}</b>
        {#each cursor.lines as l, i (i)}<span>{l}</span>{/each}
      </div>
    {/if}

  {:else}
    <p class="muted small nodata">No data in this range.</p>
  {/if}
</div>

<style>
  .plot {
    position: relative;
    min-width: 0;
  }
  svg {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
    touch-action: pan-y;
    cursor: crosshair;
    -webkit-tap-highlight-color: transparent;
    border-radius: 8px;
  }
  svg:focus {
    outline: none;
  }
  svg:focus-visible:not(.ptr) {
    outline: 2px solid var(--ui);
    outline-offset: 4px;
  }
  .cur {
    transition: transform 90ms var(--ease-out);
    pointer-events: none;
  }
  .cur line {
    stroke: var(--fg);
    stroke-opacity: 0.35;
    stroke-width: 1;
  }
  .cdot {
    fill: var(--fg);
    stroke: var(--card-b);
    stroke-width: 2;
    transition: cy 90ms var(--ease-out);
    animation: pop-in 200ms var(--ease-spring) backwards;
    transform-box: fill-box;
    transform-origin: center;
  }
  .end {
    transition: opacity var(--t-fast);
  }
  .end.dim {
    opacity: 0.35;
  }
  .tip {
    position: absolute;
    top: 2px;
    transform: translateX(10px);
    display: grid;
    gap: 1px;
    padding: 6px 9px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--bg) 88%, transparent);
    box-shadow: 0 0 0 1px var(--line-2), var(--shadow);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    font-size: 12px;
    color: var(--muted);
    white-space: nowrap;
    pointer-events: none;
    font-variant-numeric: tabular-nums;
    transition: left 90ms var(--ease-out);
    animation: tip-in 160ms var(--ease-out) backwards;
  }
  .tip.flip {
    transform: translateX(calc(-100% - 10px));
  }
  .tip b {
    color: var(--fg);
    font-weight: 500;
  }
  @keyframes tip-in {
    from {
      opacity: 0;
      scale: 0.96;
    }
  }

  text {
    font-family: var(--font-body);
    font-size: 10.5px;
    fill: var(--faint);
    font-variant-numeric: tabular-nums;
  }
  .gl {
    stroke: var(--line);
    stroke-width: 1;
  }
  .pre {
    fill: var(--well);
  }
  .bars rect {
    transform-box: fill-box;
    transform-origin: 50% 100%;
    animation: grow 300ms var(--ease-out) backwards;
    animation-delay: calc(var(--k) * 220ms);
  }
  @keyframes grow {
    from {
      transform: scaleY(0);
    }
  }
  .m7,
  .wk {
    fill: none;
    stroke-linejoin: round;
    stroke-linecap: round;
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    animation: draw 700ms var(--ease-out) 120ms forwards;
  }
  .m7 {
    stroke: var(--fg);
    stroke-width: 2.2;
  }
  .wk {
    stroke: var(--muted);
    stroke-width: 1.3;
  }
  @keyframes draw {
    to {
      stroke-dashoffset: 0;
    }
  }
  .dot {
    fill: var(--fg);
    animation: pop-in 240ms var(--ease-spring) backwards;
    animation-delay: calc(var(--k) * 30ms);
    transform-box: fill-box;
    transform-origin: center;
  }
  .med {
    stroke: var(--muted);
    stroke-width: 1.2;
    stroke-dasharray: 4 4;
    fill: none;
  }
  .thr {
    stroke: var(--lc);
    stroke-width: 1.3;
    stroke-dasharray: 1.5 4;
    stroke-linecap: round;
    fill: none;
  }
  .end {
    animation: fade-in 200ms var(--ease-out) 650ms backwards;
  }
  .halo {
    fill: var(--lc);
    opacity: 0.18;
    transform-box: fill-box;
    transform-origin: center;
    animation: halo-in 420ms var(--ease-spring) 650ms backwards;
  }
  .core {
    fill: var(--lc);
    stroke: var(--card-b);
    stroke-width: 2;
  }
  @keyframes halo-in {
    from {
      transform: scale(0.2);
      opacity: 0;
    }
  }
  .nodata {
    padding: 24px 0;
  }
  @media (prefers-reduced-motion: reduce) {
    .bars rect,
    .dot,
    .end,
    .halo,
    .cdot,
    .tip {
      animation: none;
    }
    .cur,
    .tip {
      transition: none;
    }
    .m7,
    .wk {
      animation: none;
      stroke-dashoffset: 0;
    }
  }
</style>
