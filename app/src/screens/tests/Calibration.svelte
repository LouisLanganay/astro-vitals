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
  const MIN_SCALE = 150 / CARD_WIDTH_MM;
  const MAX_SCALE = 900 / CARD_WIDTH_MM;
  const NARROW_PX = 470;

  let cardW = $state(0);
  const initial = () => Math.min(MAX_SCALE, Math.max(MIN_SCALE, pxPerMm ?? DEFAULT_PX_PER_MM));
  let scale = $state(initial());
  const upright = $derived(cardW > 0 && cardW < NARROW_PX);
  const edgeMm = $derived(upright ? CARD_HEIGHT_MM : CARD_WIDTH_MM);
  const width = $derived(Math.round(scale * edgeMm));
  const minPx = $derived(Math.round(MIN_SCALE * edgeMm));
  const maxPx = $derived(Math.round(MAX_SCALE * edgeMm));
</script>

<section class="card" aria-labelledby="c-t" bind:clientWidth={cardW}>
  <header>
    <h2 id="c-t">Calibration</h2>
    <span class="eyebrow">Once for each screen</span>
  </header>
  <p>
    {#if upright}
      The test must know the size of your display. Hold a bank card upright against the screen,
      on the rectangle. Move the slider until the rectangle has the same width as the short side
      of the card ({CARD_HEIGHT_MM} mm).
    {:else}
      The test must know the size of your display. Hold a bank card against the screen, on the
      rectangle. Move the slider until the rectangle has the same width as the card
      ({CARD_WIDTH_MM} mm).
    {/if}
  </p>
  <div class="area" class:upright>
    <div
      class="cardbox"
      style:width="{width}px"
      style:aspect-ratio={upright ? `${CARD_HEIGHT_MM} / ${CARD_WIDTH_MM}` : `${CARD_WIDTH_MM} / ${CARD_HEIGHT_MM}`}
    >
      <span class="chipline"></span>
      <span>Bank card, {edgeMm} mm</span>
    </div>
  </div>
  <label class="field">
    <span>Width of the rectangle: <span class="num">{width} px</span></span>
    <input
      type="range"
      min={minPx}
      max={maxPx}
      step="1"
      value={width}
      oninput={(e) => (scale = Number(e.currentTarget.value) / edgeMm)}
      style:--p="{((width - minPx) / (maxPx - minPx)) * 100}%"
    />
    <span class="help">The arrow keys change the width in steps of 1 px.</span>
  </label>
  <p class="small muted">
    Do the calibration again when you use a different display or a different zoom level.
  </p>
  <div class="btns">
    <button class="btn primary" disabled={busy} onclick={() => onsave(width / edgeMm)}>
      {busy ? 'Saving...' : 'Save the calibration'}
    </button>
    {#if oncancel}
      <button class="btn ghost" disabled={busy} onclick={oncancel}>Cancel</button>
    {/if}
  </div>
</section>

<style>
  .area {
    overflow-x: auto;
    padding: 4px 0;
  }
  .area.upright {
    display: flex;
    justify-content: center;
    margin-inline: calc(50% - 50vw + 8px);
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
