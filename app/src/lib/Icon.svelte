<script lang="ts">
  import { onMount } from 'svelte';

  import { FYNEX } from './fynex-icons';
  import { BEAT, play, release, type IconDef, type Shape } from './icon-motion';
  import { ICON, type IconName } from './icons';

  let { name, size = 18, active = false }: { name: IconName; size?: number; active?: boolean } = $props();

  let svg: SVGSVGElement | undefined = $state();
  const fynex = $derived<IconDef | undefined>(FYNEX[name]);
  const def = $derived<IconDef>(fynex ?? { parts: [], motion: BEAT, options: {} });
  const drawn = $derived(new Set(Object.entries(def.motion).filter(([, t]) => t.animate.pathLength !== undefined).map(([p]) => p)));

  function attrs(s: Shape) {
    const { tag: _tag, part, ...rest } = s;
    return { ...rest, 'data-part': part, pathLength: part && drawn.has(part) ? 1 : undefined };
  }

  const go = () => svg && play(svg, def);
  const stop = () => svg && release(svg);

  onMount(() => {
    if (!svg) return;
    const host = svg.closest<HTMLElement>('a, button, label, summary, [role="button"], [data-icon-trigger]') ?? svg;
    host.addEventListener('pointerenter', go);
    host.addEventListener('pointerleave', stop);
    host.addEventListener('focusin', go);
    return () => {
      host.removeEventListener('pointerenter', go);
      host.removeEventListener('pointerleave', stop);
      host.removeEventListener('focusin', go);
    };
  });

  let was = false;
  $effect(() => {
    const now = active;
    if (now && !was) queueMicrotask(go);
    was = now;
  });
</script>

<svg bind:this={svg} class="icon" class:fx={!!fynex} viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
  <g data-part="group">
    {#if fynex}
      {#each fynex.parts as s, i (i)}
        <svelte:element this={s.tag} xmlns="http://www.w3.org/2000/svg" {...attrs(s)} />
      {/each}
    {:else}
      {@html ICON[name]}
    {/if}
  </g>
</svg>

<style>
  .icon {
    flex: none;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.7;
    stroke-linecap: round;
    stroke-linejoin: round;
    overflow: visible;
  }
  .icon.fx {
    stroke-width: 1.9;
  }
</style>
