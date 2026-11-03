export function LogoMark({ className = 'brand-mark' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 46" className={className} aria-hidden="true" focusable="false">
      <path
        d="M20 3C20 3 5.5 19.5 5.5 30a14.5 14.5 0 0 0 29 0C34.5 19.5 20 3 20 3Z"
        fill="currentColor"
        opacity=".16"
      />
      <path
        d="M20 3C20 3 5.5 19.5 5.5 30a14.5 14.5 0 0 0 29 0C34.5 19.5 20 3 20 3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
      />
      <text x="20" y="34.5" textAnchor="middle" fontSize="13" fontWeight="800" fill="currentColor">
        ⵣ
      </text>
    </svg>
  );
}

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <span className="brand">
      <LogoMark />
      <span>
        <span className="brand-name" style={light ? { color: 'inherit' } : undefined}>
          Idammen
        </span>
        <span className="brand-sub" style={{ display: 'block' }}>
          BLOODLINK
        </span>
      </span>
    </span>
  );
}
