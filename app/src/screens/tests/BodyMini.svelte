<script lang="ts">
  import type { Snippet } from 'svelte';

  import type { BodyRegion, IndicatorState } from '../../lib/types';
  import DotFigure from './DotFigure.svelte';

  /** Small dot figure with no labels, next to a list given as children. For the Home card. */
  let {
    levels,
    children,
  }: { levels: Partial<Record<BodyRegion, IndicatorState>>; children: Snippet } = $props();
</script>

<div class="bodymini">
  <div class="mini" aria-hidden="true">
    <DotFigure {levels} labels={false} />
  </div>
  <div class="side">{@render children()}</div>
</div>

<style>
  .bodymini {
    display: grid;
    grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
    gap: 18px;
    align-items: center;
  }
  .mini {
    max-width: 260px;
    width: 100%;
    justify-self: center;
  }
  .side {
    min-width: 0;
  }
</style>
