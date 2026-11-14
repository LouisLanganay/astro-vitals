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

<div class="card calibration">
  <h2>Calibration</h2>
  <p>
    The test must know the size of your display. Hold a bank card against the screen, on the
    rectangle. Move the slider until the rectangle has the same width as the card
    ({CARD_WIDTH_MM} mm).
  </p>
  <p class="muted">
    Do the calibration again when you use a different display or a different zoom level.
  </p>
  <div class="rect" style:width="{width}px" style:aspect-ratio="{CARD_WIDTH_MM} / {CARD_HEIGHT_MM}">
    Bank card
  </div>
  <label class="field">
    <span>Width of the rectangle: {width} px</span>
    <input type="range" min={MIN_PX} max={MAX_PX} step="1" bind:value={width} />
    <span class="help">The arrow keys change the width in steps of 1 px.</span>
  </label>
  <div class="row">
    <button class="btn primary" disabled={busy} onclick={() => onsave(width / CARD_WIDTH_MM)}>
      {busy ? 'Saving...' : 'Save the calibration'}
    </button>
    {#if oncancel}
      <button class="btn" disabled={busy} onclick={oncancel}>Cancel</button>
    {/if}
  </div>
</div>

<style>
  .calibration {
    display: grid;
    gap: 0.75rem;
    justify-items: start;
  }
  .rect {
    display: grid;
    place-items: center;
    border: 2px solid var(--accent);
    border-radius: 3mm;
    background: var(--accent-soft);
    color: var(--muted);
  }
  .field {
    width: 100%;
    max-width: 40rem;
  }
</style>
