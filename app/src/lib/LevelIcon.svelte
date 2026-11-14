<script lang="ts">
  import { LEVEL_ICON } from './icons';
  import type { IndicatorState } from './types';

  let { state, size = 8 }: { state: IndicatorState; size?: number } = $props();
</script>

<svg class="lvicon" viewBox="0 0 12 12" width={size} height={size} aria-hidden="true">
  {@html LEVEL_ICON[state]}
</svg>
