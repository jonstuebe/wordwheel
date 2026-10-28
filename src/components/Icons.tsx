const stroke = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" strokeWidth={2.4} {...stroke}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function ShuffleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" strokeWidth={2} {...stroke}>
      <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
    </svg>
  );
}

export function HintIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" strokeWidth={2} {...stroke}>
      <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" strokeWidth={2.4} {...stroke}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
