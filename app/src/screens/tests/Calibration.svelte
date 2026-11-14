<script lang="ts">
  import { CARD_WIDTH_MM } from '../../lib/types';

  let {
    pxPerMm,
    busy,
    onsave,
    oncancel,
  }: {
    pxPerMm: number | null;
    busy: boolean;
    onsave: (pxPerMm: number) => void;
    oncancel: (() => void) | null;
  } = $props();

  const CARD_HEIGHT_MM = 53.98;
  const DEFAULT_PX_PER_MM = 96 / 25.4;
  const MIN_PX = 150;
  const MAX_PX = 900;

  const initial = () =>
    Math.min(MAX_PX, Math.max(MIN_PX, Math.round((pxPerMm ?? DEFAULT_PX_PER_MM) * CARD_WIDTH_MM)));

  let width = $state(initial());
</script>

<section class="card" aria-labelledby="c-t">
  <header>
    <h2 id="c-t">Calibration</h2>
    <span class="eyebrow">Once for each screen</span>
  </header>
  <p>
    The test must know the size of your display. Hold a bank card against the screen, on the
    rectangle. Move the slider until the rectangle has the same width as the card
    ({CARD_WIDTH_MM} mm).
  </p>
  <div class="area">
    <div
      class="cardbox"
      style:width="{width}px"
      style:aspect-ratio="{CARD_WIDTH_MM} / {CARD_HEIGHT_MM}"
    >
      <span class="chipline"></span>
      <span>Bank card, {CARD_WIDTH_MM} mm</span>
    </div>
  </div>
  <label class="field">
    <span>Width of the rectangle: <span class="num">{width} px</span></span>
    <input
      type="range"
      min={MIN_PX}
      max={MAX_PX}
      step="1"
      bind:value={width}
      style:--p="{((width - MIN_PX) / (MAX_PX - MIN_PX)) * 100}%"
    />
    <span class="help">The arrow keys change the width in steps of 1 px.</span>
  </label>
  <p class="small muted">
    Do the calibration again when you use a different display or a different zoom level.
  </p>
  <div class="btns">
    <button class="btn primary" disabled={busy} onclick={() => onsave(width / CARD_WIDTH_MM)}>
      {busy ? 'Saving...' : 'Save the calibration'}
    </button>
    {#if oncancel}
      <button class="btn ghost" disabled={busy} onclick={oncancel}>Cancel</button>
    {/if}
  </div>
</section>

<style>
  /* The rectangle keeps its exact width in px: the area scrolls instead of shrinking it. */
  .area {
    overflow-x: auto;
    padding: 4px 0;
  }
  .cardbox {
    position: relative;
    display: flex;
    align-items: flex-end;
    justify-content: flex-start;
    padding: 12px 14px;
    border: 1.5px solid var(--fg);
    border-radius: 3mm;
    background: linear-gradient(135deg, var(--well-2), var(--well));
    color: var(--muted);
    font-size: 12px;
    transition: border-color var(--t-fast);
  }
  .chipline {
    position: absolute;
    top: 30%;
    left: 10%;
    width: 13%;
    aspect-ratio: 4 / 3;
    border-radius: 4px;
    background: color-mix(in srgb, var(--fg) 14%, transparent);
    box-shadow: inset 0 0 0 1px var(--line-2);
  }
  .field {
    max-width: 40rem;
  }
</style>
