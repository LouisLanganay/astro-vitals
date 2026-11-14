<script lang="ts">
  import { STATE_LABEL } from './labels';
  import type { IndicatorState } from './types';

  let { state }: { state: IndicatorState } = $props();

  const ICON: Record<IndicatorState, string> = {
    not_enough_data: 'M9 9a3 3 0 1 1 4.5 2.6c-.9.5-1.5 1.1-1.5 2.4M12 17.5v.5',
    ok: 'M6 12.5l4 4 8-9',
    self_care: 'M12 7v6M12 16.5v.5',
    tell_cmo: 'M12 4l9 16H3zM12 10v4M12 17v.5',
    flight_surgeon: 'M12 5v14M5 12h14',
  };
</script>

<span class="badge {state}">
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path d={ICON[state]} />
  </svg>
  {STATE_LABEL[state]}
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.15rem 0.6rem 0.15rem 0.45rem;
    border-radius: 999px;
    border: 1.5px solid var(--c);
    background: color-mix(in srgb, var(--c) 14%, transparent);
    color: var(--text);
    font-size: 0.85rem;
    font-weight: 600;
    white-space: nowrap;
  }
  svg {
    fill: none;
    stroke: var(--c);
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .not_enough_data {
    --c: var(--level-none);
    border-style: dashed;
  }
  .ok {
    --c: var(--level-ok);
  }
  .self_care {
    --c: var(--level-self-care);
  }
  .tell_cmo {
    --c: var(--level-tell-cmo);
  }
  .flight_surgeon {
    --c: var(--level-flight-surgeon);
  }
</style>
