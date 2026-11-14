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
  }: {
    points: SeriesPoint[];
    baseline: number | null;
    label: string;
    state?: IndicatorState;
    weekly?: boolean;
    thresholds?: { value: number; level: Level }[];
    minSpan?: number;
    until?: number | null;
  } = $props();

  let width = $state(520);
  const H = 184;
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
    };
  });
</script>

<div class="plot" bind:clientWidth={width}>
  {#if chart}
    <svg
      viewBox="0 0 {chart.W} {H}"
      role="img"
      aria-label="{label}: {weekly ? 'weekly values' : 'daily values, 7-day mean'} and baseline median"
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
        <g class="end" data-lv={level}>
          <circle class="halo" cx={chart.end.x} cy={chart.end.y} r="10" />
          <circle class="core" cx={chart.end.x} cy={chart.end.y} r="4.6" />
        </g>
      {/if}
    </svg>
  {:else}
    <p class="muted small nodata">No data in this range.</p>
  {/if}
</div>

<style>
  .plot {
    min-width: 0;
  }
  svg {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
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
    .halo {
      animation: none;
    }
    .m7,
    .wk {
      animation: none;
      stroke-dashoffset: 0;
    }
  }
</style>
