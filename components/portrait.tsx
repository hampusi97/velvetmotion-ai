export function Portrait({
  id,
  name,
  palette,
  className,
}: {
  id: string;
  name: string;
  palette: readonly string[];
  className?: string;
}) {
  const [back = "#2a0d18", accent = "#e11d48", tone = "#f3c7c3"] = palette;
  const initials = name
    .split(" ")
    .map((part) => part[0] || "")
    .slice(0, 2)
    .join("");
  const gradientId = `portrait-${id}`;

  return (
    <svg viewBox="0 0 80 104" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label={`Abstract portrait of ${name}, a fictional adult`}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={back} />
          <stop offset="100%" stopColor={accent} />
        </linearGradient>
      </defs>
      <rect width="80" height="104" rx="18" fill={`url(#${gradientId})`} />
      <circle cx="40" cy="40" r="14" fill={tone} opacity="0.92" />
      <path d="M16 104c3-26 13-38 24-38s21 12 24 38" fill={tone} opacity="0.8" />
      <text x="40" y="44" textAnchor="middle" fontSize="11" fontFamily="Georgia, serif" fill={back}>
        {initials}
      </text>
    </svg>
  );
}
