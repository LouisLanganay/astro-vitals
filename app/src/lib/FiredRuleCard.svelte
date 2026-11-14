<script lang="ts">
  import LevelBadge from './LevelBadge.svelte';
  import type { FiredRule } from './types';

  let { rule }: { rule: FiredRule } = $props();
</script>

<article class="card rule">
  <LevelBadge state={rule.level} />
  <p class="action">{rule.action}</p>
  <p>{rule.explanation}</p>
  <p class="muted">Source: <span class="source">{rule.source}</span></p>
</article>

<style>
  .rule {
    display: grid;
    gap: 0.4rem;
    justify-items: start;
  }
  .action {
    font-weight: 600;
  }
  .source {
    user-select: all;
    overflow-wrap: anywhere;
  }
</style>
