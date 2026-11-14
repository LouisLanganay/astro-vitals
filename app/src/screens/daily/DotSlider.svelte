<script lang="ts">
  let {
    value = $bindable(),
    max = 10,
    labelledby,
    describedby,
    invalid = false,
  }: {
    value: number;
    max?: number;
    labelledby: string;
    describedby?: string;
    invalid?: boolean;
  } = $props();

  const BETWEEN = 2;
  const KEYS: Record<string, number> = {
    ArrowRight: 1,
    ArrowUp: 1,
    ArrowLeft: -1,
    ArrowDown: -1,
    PageUp: 2,
    PageDown: -2,
  };

  const last = $derived(max * (BETWEEN + 1));
  const dots = $derived(Array.from({ length: last + 1 }, (_, i) => i));

  let track = $state<HTMLElement>();
  let held = $state(false);

  function set(next: number) {
    value = Math.max(0, Math.min(max, Math.round(next)));
  }

  function point(e: PointerEvent) {
    if (!track) return;
    const box = track.getBoundingClientRect();
    const pad = box.height / 2;
    set(((e.clientX - box.left - pad) / (box.width - 2 * pad)) * max);
  }

  function down(e: PointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    held = true;
    track?.setPointerCapture(e.pointerId);
    point(e);
  }

  function move(e: PointerEvent) {
    if (held) point(e);
  }

  function key(e: KeyboardEvent) {
    if (e.key in KEYS) set(value + KEYS[e.key]);
    else if (e.key === 'Home') set(0);
    else if (e.key === 'End') set(max);
    else return;
    e.preventDefault();
  }
</script>

<div
  class="slider"
  class:held
  class:bad={invalid}
  bind:this={track}
  role="slider"
  tabindex="0"
  aria-valuemin={0}
  aria-valuemax={max}
  aria-valuenow={value}
  aria-valuetext="{value} of {max}"
  aria-labelledby={labelledby}
  aria-describedby={describedby}
  aria-invalid={invalid}
  style:--p={value / max}
  onpointerdown={down}
  onpointermove={move}
  onpointerup={() => (held = false)}
  onpointercancel={() => (held = false)}
  onkeydown={key}
>
  <span class="dots" aria-hidden="true">
    {#each dots as i (i)}
      {@const on = i <= value * (BETWEEN + 1)}
      <i
        class:stop={i % (BETWEEN + 1) === 0}
        class:on
        style:left="{(i / last) * 100}%"
        style:opacity={on ? (0.3 + 0.7 * (i / Math.max(1, value * (BETWEEN + 1))) ** 1.6).toFixed(2) : null}
      ></i>
    {/each}
  </span>
  <span class="knob" aria-hidden="true"></span>
</div>

<style>
  .slider {
    --h: 44px;
    position: relative;
    height: var(--h);
    border-radius: 999px;
    background: var(--well-2);
    box-shadow: inset 0 0 0 1px var(--line);
    cursor: pointer;
    touch-action: pan-y;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    transition: box-shadow var(--t-fast) var(--ease-out);
  }
  .slider:focus-visible {
    outline: 2px solid var(--ui);
    outline-offset: 2px;
    border-radius: 999px;
  }
  .slider.bad {
    box-shadow: inset 0 0 0 1.5px var(--red);
  }
  .dots {
    position: absolute;
    inset: 0 calc(var(--h) / 2);
    pointer-events: none;
  }
  .dots i {
    position: absolute;
    top: 50%;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--dot);
    translate: -50% -50%;
    transition:
      background-color var(--t-mid) var(--ease-out),
      opacity var(--t-mid) var(--ease-out),
      scale var(--t-mid) var(--ease-out);
  }
  .dots i.stop {
    width: 7px;
    height: 7px;
    background: var(--dot-2);
  }
  .dots i.on {
    background: var(--ui);
    scale: 1.2;
  }
  .knob {
    position: absolute;
    top: 50%;
    left: calc(var(--h) / 2 + var(--p) * (100% - var(--h)));
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: var(--knob);
    box-shadow:
      0 0 0 4px color-mix(in srgb, var(--ui) 32%, transparent),
      0 3px 10px rgba(0, 0, 0, 0.45);
    translate: -50% -50%;
    pointer-events: none;
    transition:
      left var(--t-mid) var(--ease-spring),
      scale var(--t-fast) var(--ease-out),
      box-shadow var(--t-fast) var(--ease-out);
  }
  .slider.held .knob {
    scale: 1.14;
    box-shadow:
      0 0 0 7px color-mix(in srgb, var(--ui) 30%, transparent),
      0 3px 10px rgba(0, 0, 0, 0.45);
    transition:
      left 60ms linear,
      scale var(--t-fast) var(--ease-out),
      box-shadow var(--t-fast) var(--ease-out);
  }
  @media (hover: hover) {
    .slider:hover {
      box-shadow: inset 0 0 0 1px var(--line-2);
    }
  }
  @media (pointer: coarse) {
    .slider {
      --h: 48px;
    }
    .knob {
      width: 30px;
      height: 30px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .knob,
    .dots i {
      transition: none;
    }
  }
</style>
