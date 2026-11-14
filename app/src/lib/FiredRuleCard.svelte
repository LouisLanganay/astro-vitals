<script lang="ts">
  import Icon from './Icon.svelte';
  import LevelBadge from './LevelBadge.svelte';
  import LevelIcon from './LevelIcon.svelte';
  import { isUrl, ruleFact, ruleTitle, sourceLabel } from './rules';
  import type { Snippet } from 'svelte';

  import type { FiredRule } from './types';

  let {
    rule,
    index = 0,
    children,
  }: { rule: FiredRule; index?: number; children?: Snippet } = $props();

  const fact = $derived(ruleFact(rule));
</script>

<article class="ins rise" data-lv={rule.level} style:--i={index}>
  <div class="ih">
    <span class="ic lvic"><LevelIcon state={rule.level} size={11} /></span>
    <LevelBadge state={rule.level} />
  </div>
  <h3>{ruleTitle(rule)}</h3>
  <p class="act">{rule.action}</p>
  {#if fact}
    <p class="fact">{fact}</p>
  {/if}
  <p class="why">{rule.explanation}</p>
  <div class="foot">
    <p class="src">
      <Icon name="link" size={13} />
      {#if isUrl(rule.source)}
        <a href={rule.source} target="_blank" rel="noopener noreferrer" aria-label="Source: {sourceLabel(rule.source)}">
          {sourceLabel(rule.source)}
        </a>
      {:else}
        {rule.source}
      {/if}
    </p>
    {#if children}
      <div class="btns">{@render children()}</div>
    {/if}
  </div>
</article>

<style>
  .ins {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 18px 20px 20px;
    border-radius: 20px;
    background: var(--well);
    box-shadow: inset 0 0 0 1px var(--line);
    transition: box-shadow var(--t-mid) var(--ease-out);
  }
  @media (hover: hover) { .ins:hover {
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--lc) 28%, var(--line));
  } }
  .ih {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-bottom: 4px;
  }
  h3 {
    font-size: 20px;
    font-weight: 500;
    letter-spacing: -0.025em;
    line-height: 1.22;
    text-wrap: balance;
  }
  .act {
    font-size: 15px;
  }
  .fact {
    font-family: var(--font-data);
    font-size: 12px;
    color: var(--muted);
  }
  .why,
  .src {
    font-size: 13px;
    color: var(--muted);
  }
  .foot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px 12px;
  }
  .foot .btns {
    margin-left: auto;
  }
  .src {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
  }
</style>
