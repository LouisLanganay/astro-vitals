<script lang="ts">
  import { cubicOut } from 'svelte/easing';
  import { prefersReducedMotion, Tween } from 'svelte/motion';

  import { timeToMin } from '../../lib/format';
  import { MINUTES_PER_DAY } from '../../lib/types';

  let { start, end }: { start: string; end: string } = $props();

  const W = 420;
  const PAD = 6;
  const SPAN = 18 * 60;
  const LABELS = ['18:00', '21:00', '00:00', '03:00', '06:00', '09:00', '12:00'];

  const x = (min: number) => PAD + (((min - 1080 + MINUTES_PER_DAY) % MINUTES_PER_DAY) / SPAN) * (W - 2 * PAD);

  const target = $derived.by(() => {
    if (!start || !end || start === end) return null;
    const s = timeToMin(start);
    const hours = ((timeToMin(end) - s + MINUTES_PER_DAY) % MINUTES_PER_DAY) / 60;
    let a = x(s);
    if (a > W - 18) a = PAD;
    const e = Math.min(W - PAD, a + ((hours * 60) / SPAN) * (W - 2 * PAD));
    return { a, w: Math.max(12, e - a) };
  });

  const ta = new Tween(PAD, { easing: cubicOut });
  const tw = new Tween(0, { easing: cubicOut });
  let first = true;

  $effect(() => {
    const t = target;
    const duration = prefersReducedMotion.current ? 0 : first ? 420 : 260;
    if (first && t) ta.set(t.a, { duration: 0 });
    first = false;
    if (t) {
      ta.set(t.a, { duration });
      tw.set(t.w, { duration });
    } else {
      tw.set(0, { duration });
    }
  });
</script>

<svg viewBox="0 0 {W} 44" role="img" aria-label="Sleep window on a scale from 18:00 to 12:00">
  <rect x={PAD} y="6" width={W - 2 * PAD} height="12" rx="6" fill="var(--well-2)" />
  {#if tw.current > 0.5}
    <rect x={ta.current} y="6" width={tw.current} height="12" rx="6" fill="url(#g-ui)" />
  {/if}
  {#each LABELS as label, i (label)}
    <text
      x={PAD + (i * (W - 2 * PAD)) / 6}
      y="38"
      text-anchor={i === 0 ? 'start' : i === 6 ? 'end' : 'middle'}>{label}</text
    >
  {/each}
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    height: auto;
  }
  text {
    font-family: var(--font-body);
    font-size: 10.5px;
    fill: var(--faint);
  }
</style>
