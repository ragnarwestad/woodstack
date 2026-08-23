type Props = {
  /** A number of pixels or any CSS length. The header passes custom
   *  properties, so that one media query can size the mark with the type
   *  beside it rather than the two drifting apart. */
  h?: number | string
  w?: number | string
}

/** The five split logs from the app icon, cropped to the stack itself and
 *  carrying no tile — the header sits on the page's own background.
 *
 *  Drawn here rather than imported from `logo.svg`, because one of the rings
 *  needs a colour the app's theme decides. The fifth log's outer ring is cream
 *  (`#F7EBD3`), the same colour the light theme paints the page, so in light it
 *  vanishes and the mark reads as four logs and a floating ember. A bark edge
 *  in light fixes that; dark needs none, since a cream ring already reads
 *  against near-black — so there the ring is stroked in its own cream, which
 *  draws no edge at all while still painting out to the radius the other four
 *  logs have. `light-dark()` picks between the two — the same way `ProgressRing`
 *  and `DryingCurveChart` colour their hand-drawn shapes — and it answers to the
 *  app's own colour scheme. An `<img>`-loaded SVG opens as its own document and
 *  would only ever see the browser's `prefers-color-scheme`, which a visitor
 *  here can disagree with.
 *
 *  Geometry, fills and `viewBox` are `logo.svg`'s, unchanged. */
export function Logo({ h = 52, w = 78 }: Props) {
  return (
    <svg width={w} height={h} viewBox="28 104 456 304" aria-hidden="true">
      <g>
        <g transform="translate(180 180)"><circle r={76} fill="#E1512A" /><circle r={52} fill="#E8A32A" /><circle r={28} fill="#3A1A38" /></g>
        <g transform="translate(332 180)"><circle r={76} fill="#157F76" /><circle r={52} fill="#F7EBD3" /><circle r={28} fill="#157F76" /></g>
        <g transform="translate(104 332)"><circle r={76} fill="#E8A32A" /><circle r={52} fill="#B8336A" /><circle r={28} fill="#F7EBD3" /></g>
        <g transform="translate(256 332)"><circle r={76} fill="#B8336A" /><circle r={52} fill="#E8A32A" /><circle r={28} fill="#3A1A38" /></g>
        <g transform="translate(408 332)">
          {/* r 72 plus a centred stroke of 8 puts the painted edge back out at
              r 76, the boundary the drawing always had. The fourth log sits
              exactly tangent to this one (dx 152 = 76 + 76), so a stroke
              centred on r 76 would have bitten into its disc at the seam —
              and a stroke that paints nothing would leave this log visibly
              smaller than the four beside it. */}
          <circle
            data-testid="fifth-log-ring"
            r={72}
            fill="#F7EBD3"
            stroke="light-dark(#2E1A0F, #F7EBD3)"
            strokeWidth={8}
          />
          <circle r={52} fill="#E1512A" />
          <circle r={28} fill="#E8A32A" />
        </g>
      </g>
    </svg>
  )
}
