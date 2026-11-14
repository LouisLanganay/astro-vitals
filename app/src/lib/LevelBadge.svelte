<script lang="ts">
  import { STATE_LABEL } from './labels';
  import LevelIcon from './LevelIcon.svelte';
  import type { IndicatorState } from './types';

  /** Level chip. `size="lg"` for the page header. It pops in again when the level changes. */
  let { state, size = 'md' }: { state: IndicatorState; size?: 'md' | 'lg' } = $props();
</script>

{#key state}
  <span class="chip pop" class:lg={size === 'lg'} data-lv={state}>
    <LevelIcon {state} size={size === 'lg' ? 9 : 8} />
    {STATE_LABEL[state]}
  </span>
{/key}
