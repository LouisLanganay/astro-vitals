<script lang="ts">
  // Gradients and the glow filter shared by every chart. Mounted once in App.
</script>

<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="g-bar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" style="stop-color:var(--bar-a)" />
      <stop offset="1" style="stop-color:var(--bar-b)" />
    </linearGradient>
    <linearGradient id="g-ui" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" style="stop-color:var(--ui)" />
      <stop offset="1" style="stop-color:var(--ui-2)" />
    </linearGradient>
    <linearGradient id="g-self_care" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" style="stop-color:var(--yellow)" />
      <stop offset="1" style="stop-color:color-mix(in srgb, var(--yellow) 35%, var(--bar-b))" />
    </linearGradient>
    <linearGradient id="g-tell_cmo" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" style="stop-color:var(--orange)" />
      <stop offset="1" style="stop-color:color-mix(in srgb, var(--orange) 35%, var(--bar-b))" />
    </linearGradient>
    <linearGradient id="g-flight_surgeon" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" style="stop-color:var(--red)" />
      <stop offset="1" style="stop-color:color-mix(in srgb, var(--red) 35%, var(--bar-b))" />
    </linearGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="3.2" result="b" />
      <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
  </defs>
</svg>
