<script lang="ts">
  import { cubicOut } from 'svelte/easing';
  import { prefersReducedMotion, Tween } from 'svelte/motion';

  /** A number that counts up when it shows and ticks to its new value when it changes. */
  let { value, decimals = 0 }: { value: number; decimals?: number } = $props();

  const tween = new Tween(0, { duration: 0, easing: cubicOut });
  let first = true;

  // It counts up from zero when it first shows, then ticks from the last value.
  $effect(() => {
    const target = value;
    const duration = prefersReducedMotion.current ? 0 : first ? 700 : 300;
    first = false;
    tween.set(target, { duration });
  });

  const text = $derived(
    tween.current.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }),
  );
</script>

<span class="tick">{text}</span>

<style>
  .tick {
    font-variant-numeric: tabular-nums;
  }
</style>
