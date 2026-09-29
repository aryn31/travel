/**
 * Hero landscape. Vector rather than a photograph: it stays sharp on any
 * display, weighs a few KB instead of a few hundred, needs no licensing, and
 * recolours itself for light and dark instead of needing two files.
 *
 * Ridgelines come from midpoint displacement and are drawn with straight
 * segments -- mountains are angular, and smoothing them into curves makes
 * them read as hills. Depth is carried by atmospheric perspective: each range
 * further back is lighter and lower in contrast, the way haze actually works.
 */
export function HeroMountains({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1440 820"
      // Crop rather than squash: on a wide, short viewport the ridgeline
      // stays anchored to the bottom and the sky is what gets trimmed.
      preserveAspectRatio="xMidYMax slice"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--hero-sky-top)" />
          <stop offset="48%" stopColor="var(--hero-sky-mid)" />
          <stop offset="82%" stopColor="var(--hero-sky-low)" />
          <stop offset="100%" stopColor="var(--hero-sky-low)" />
        </linearGradient>

        <radialGradient id="hero-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="var(--hero-sun)" stopOpacity="0.85" />
          <stop offset="40%" stopColor="var(--hero-sun)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--hero-sun)" stopOpacity="0" />
        </radialGradient>

        {/* Haze pooling in the valleys, densest just above each ridgeline. */}
        <linearGradient id="hero-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--hero-haze)" stopOpacity="0" />
          <stop offset="55%" stopColor="var(--hero-haze)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--hero-haze)" stopOpacity="0" />
        </linearGradient>

        {/* Faint grain: large flat gradients band badly, noise breaks it up. */}
        <filter id="hero-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="4" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>

      <rect width="1440" height="820" fill="url(#hero-sky)" />

      <circle cx="1090" cy="300" r="44" fill="var(--hero-sun)" opacity="var(--hero-sun-disc)" />
      <circle cx="1090" cy="300" r="330" fill="url(#hero-sun)" />

      {/* Far range */}
      <path d="M0,389 L22,414 L45,430 L68,430 L90,431 L112,429 L135,439 L158,448 L180,432 L202,443 L225,429 L248,431 L270,415 L292,423 L315,421 L338,433 L360,455 L382,435 L405,428 L428,430 L450,443 L472,436 L495,452 L518,462 L540,458 L562,449 L585,444 L608,465 L630,468 L652,475 L675,489 L698,524 L720,536 L742,541 L765,528 L788,522 L810,542 L832,515 L855,503 L878,515 L900,505 L922,502 L945,502 L968,514 L990,502 L1012,490 L1035,484 L1058,466 L1080,471 L1102,471 L1125,465 L1148,454 L1170,429 L1192,429 L1215,441 L1238,436 L1260,452 L1282,453 L1305,463 L1328,474 L1350,462 L1372,454 L1395,432 L1418,408 L1440,403 L1440,820 L0,820 Z" fill="var(--hero-far)" />
      <path d="M0,389 L22,414 L45,430 L68,430 L90,431 L112,429 L135,439 L158,448 L180,432 L202,443 L225,429 L248,431 L270,415 L292,423 L315,421 L338,433 L360,455 L382,435 L405,428 L428,430 L450,443 L472,436 L495,452 L518,462 L540,458 L562,449 L585,444 L608,465 L630,468 L652,475 L675,489 L698,524 L720,536 L742,541 L765,528 L788,522 L810,542 L832,515 L855,503 L878,515 L900,505 L922,502 L945,502 L968,514 L990,502 L1012,490 L1035,484 L1058,466 L1080,471 L1102,471 L1125,465 L1148,454 L1170,429 L1192,429 L1215,441 L1238,436 L1260,452 L1282,453 L1305,463 L1328,474 L1350,462 L1372,454 L1395,432 L1418,408 L1440,403" fill="none" stroke="var(--hero-rim)" strokeOpacity="var(--hero-rim-far)" strokeWidth="1.5" />
      <rect x="0" y="320" width="1440" height="300" fill="url(#hero-haze)" opacity="var(--hero-haze-far)" />

      {/* Middle range */}
      <path d="M0,486 L22,484 L45,478 L68,480 L90,474 L112,463 L135,458 L158,468 L180,471 L202,475 L225,463 L248,452 L270,462 L292,479 L315,473 L338,479 L360,492 L382,490 L405,508 L428,493 L450,498 L472,502 L495,514 L518,508 L540,525 L562,531 L585,542 L608,562 L630,587 L652,592 L675,590 L698,582 L720,577 L742,585 L765,569 L788,578 L810,578 L832,580 L855,592 L878,608 L900,604 L922,595 L945,575 L968,585 L990,570 L1012,562 L1035,542 L1058,544 L1080,521 L1102,509 L1125,512 L1148,489 L1170,478 L1192,483 L1215,462 L1238,441 L1260,446 L1282,469 L1305,469 L1328,481 L1350,470 L1372,464 L1395,477 L1418,460 L1440,461 L1440,820 L0,820 Z" fill="var(--hero-mid)" />
      <path d="M0,486 L22,484 L45,478 L68,480 L90,474 L112,463 L135,458 L158,468 L180,471 L202,475 L225,463 L248,452 L270,462 L292,479 L315,473 L338,479 L360,492 L382,490 L405,508 L428,493 L450,498 L472,502 L495,514 L518,508 L540,525 L562,531 L585,542 L608,562 L630,587 L652,592 L675,590 L698,582 L720,577 L742,585 L765,569 L788,578 L810,578 L832,580 L855,592 L878,608 L900,604 L922,595 L945,575 L968,585 L990,570 L1012,562 L1035,542 L1058,544 L1080,521 L1102,509 L1125,512 L1148,489 L1170,478 L1192,483 L1215,462 L1238,441 L1260,446 L1282,469 L1305,469 L1328,481 L1350,470 L1372,464 L1395,477 L1418,460 L1440,461" fill="none" stroke="var(--hero-rim)" strokeOpacity="var(--hero-rim-mid)" strokeWidth="1.5" />
      <rect x="0" y="420" width="1440" height="280" fill="url(#hero-haze)" opacity="var(--hero-haze-mid)" />

      {/* Near range */}
      <path d="M0,555 L22,548 L45,559 L68,535 L90,531 L112,521 L135,525 L158,523 L180,514 L202,502 L225,494 L248,483 L270,481 L292,496 L315,508 L338,503 L360,500 L382,481 L405,471 L428,479 L450,475 L472,492 L495,500 L518,494 L540,499 L562,507 L585,511 L608,526 L630,539 L652,553 L675,550 L698,574 L720,588 L742,580 L765,582 L788,603 L810,603 L832,585 L855,584 L878,579 L900,579 L922,583 L945,576 L968,556 L990,551 L1012,549 L1035,548 L1058,548 L1080,568 L1102,561 L1125,547 L1148,539 L1170,520 L1192,520 L1215,518 L1238,520 L1260,505 L1282,505 L1305,512 L1328,524 L1350,528 L1372,533 L1395,534 L1418,537 L1440,536 L1440,820 L0,820 Z" fill="var(--hero-near)" />
      <path d="M0,555 L22,548 L45,559 L68,535 L90,531 L112,521 L135,525 L158,523 L180,514 L202,502 L225,494 L248,483 L270,481 L292,496 L315,508 L338,503 L360,500 L382,481 L405,471 L428,479 L450,475 L472,492 L495,500 L518,494 L540,499 L562,507 L585,511 L608,526 L630,539 L652,553 L675,550 L698,574 L720,588 L742,580 L765,582 L788,603 L810,603 L832,585 L855,584 L878,579 L900,579 L922,583 L945,576 L968,556 L990,551 L1012,549 L1035,548 L1058,548 L1080,568 L1102,561 L1125,547 L1148,539 L1170,520 L1192,520 L1215,518 L1238,520 L1260,505 L1282,505 L1305,512 L1328,524 L1350,528 L1372,533 L1395,534 L1418,537 L1440,536" fill="none" stroke="var(--hero-rim)" strokeOpacity="var(--hero-rim-near)" strokeWidth="1.5" />
      <rect x="0" y="520" width="1440" height="260" fill="url(#hero-haze)" opacity="var(--hero-haze-near)" />

      {/* Foreground */}
      <path d="M0,643 L22,647 L45,651 L68,641 L90,643 L112,649 L135,643 L158,648 L180,650 L202,645 L225,627 L248,629 L270,625 L292,616 L315,619 L338,617 L360,612 L382,618 L405,616 L428,624 L450,621 L472,616 L495,616 L518,607 L540,598 L562,602 L585,600 L608,593 L630,596 L652,600 L675,594 L698,597 L720,591 L742,593 L765,608 L788,617 L810,622 L832,620 L855,623 L878,622 L900,630 L922,630 L945,627 L968,644 L990,647 L1012,648 L1035,647 L1058,653 L1080,670 L1102,669 L1125,669 L1148,661 L1170,645 L1192,657 L1215,656 L1238,656 L1260,649 L1282,650 L1305,665 L1328,686 L1350,692 L1372,701 L1395,708 L1418,699 L1440,703 L1440,820 L0,820 Z" fill="var(--hero-front)" />

      <rect
        width="1440"
        height="820"
        filter="url(#hero-grain)"
        opacity="var(--hero-grain)"
        style={{ mixBlendMode: "overlay" }}
      />
    </svg>
  );
}
