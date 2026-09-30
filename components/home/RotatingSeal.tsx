/**
 * A circular seal with text running round it, slowly turning.
 *
 * The text follows a <textPath> on a circle -- the only way to set type on a
 * curve without hand-placing every glyph. Rotation is applied to the whole
 * SVG rather than the path so the letters keep their spacing.
 */
export function RotatingSeal({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none select-none ${className}`} aria-hidden>
      <svg viewBox="0 0 200 200" className="seal-spin h-full w-full">
        <defs>
          <path
            id="seal-ring"
            fill="none"
            d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0"
          />
        </defs>

        <circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
        <circle
          cx="100"
          cy="100"
          r="82"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.5"
          strokeWidth="2"
          strokeDasharray="3 7"
          strokeLinecap="round"
        />

        <text
          className="font-display"
          fill="currentColor"
          fontSize="15"
          fontWeight="600"
          letterSpacing="3.4"
        >
          <textPath href="#seal-ring" startOffset="0%">
            FIELD NOTES · FROM EVERYWHERE · SINCE 2026 ·
          </textPath>
        </text>

        {/* Compass rose in the middle. */}
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none">
          <path d="M100,62 L100,138 M62,100 L138,100" strokeOpacity="0.4" />
          <path d="M100,62 L108,92 L100,100 L92,92 Z" fill="currentColor" fillOpacity="0.65" stroke="none" />
          <path d="M100,138 L92,108 L100,100 L108,108 Z" fill="currentColor" fillOpacity="0.3" stroke="none" />
        </g>
      </svg>
    </div>
  );
}
