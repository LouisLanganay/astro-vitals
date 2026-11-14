<script lang="ts">
  import { cubicOut } from 'svelte/easing';
  import { prefersReducedMotion, Tween } from 'svelte/motion';

  let { value, decimals = 0 }: { value: number; decimals?: number } = $props();

  const tween = new Tween(0, { duration: 0, easing: cubicOut });
  let first = true;

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
