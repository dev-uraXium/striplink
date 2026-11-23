// StripLink mark: three stacked flight strips, the top one "live"
export default function BrandMark({
  className = 'size-8',
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <rect x="3" y="5" width="26" height="6" rx="2" fill="#3B82F6" />
      <rect
        x="3"
        y="13"
        width="26"
        height="6"
        rx="2"
        fill="#3B82F6"
        fillOpacity="0.55"
      />
      <rect
        x="3"
        y="21"
        width="26"
        height="6"
        rx="2"
        fill="#3B82F6"
        fillOpacity="0.25"
      />
      <rect x="6" y="7" width="3" height="2" rx="1" fill="#fff" />
    </svg>
  );
}
