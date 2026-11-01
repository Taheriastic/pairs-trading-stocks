export function LabMark({ small = false }: { small?: boolean }) {
  return (
    <svg
      width={small ? 28 : 38}
      height={small ? 28 : 38}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="11" fill="#172d45" />
      <path
        d="M9 12L15 12L25 28H31M9 28H15L25 12H31"
        stroke="#78cfbd"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="12" r="2.5" fill="#fff" />
      <circle cx="31" cy="12" r="2.5" fill="#fff" />
    </svg>
  );
}
export function TickerMark({ symbol }: { symbol: string }) {
  return (
    <span
      className={`ticker-mark ticker-${symbol.toLowerCase()}`}
      aria-label={symbol}
    >
      {symbol}
    </span>
  );
}
