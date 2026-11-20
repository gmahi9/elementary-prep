export function Mascot({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 88 88" aria-hidden="true">
      <ellipse cx="44" cy="48" rx="34" ry="13" fill="none" stroke="#7ec4ef" strokeWidth="2.4" />
      <path d="M68 18l1.5 3.4 3.6.4-2.7 2.3.8 3.5L68 26l-3.2 1.6.8-3.5-2.7-2.3 3.6-.4z" fill="#fffaf6" />
      <circle cx="44" cy="40" r="18" fill="#ffc56a" stroke="#1c2430" strokeWidth="2.2" />
      <circle cx="33" cy="44" r="3.1" fill="#ff9a4a" />
      <circle cx="55" cy="44" r="3.1" fill="#ff9a4a" />
      <circle cx="38" cy="38" r="2.1" fill="#1c2430" />
      <circle cx="50" cy="38" r="2.1" fill="#1c2430" />
      <path d="M36 46c2.4 3.4 13.6 3.4 16 0" fill="none" stroke="#1c2430" strokeWidth="2.1" strokeLinecap="round" />
      <rect x="28" y="66" width="13" height="8" rx="4" fill="#4aa3e0" />
      <rect x="46" y="71" width="13" height="8" rx="4" fill="#ffb15a" />
    </svg>
  );
}
