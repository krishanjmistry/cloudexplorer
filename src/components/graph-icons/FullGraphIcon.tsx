// network icon representing full graph
export function FullGraphIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={0}
    >
      <circle cx="6" cy="6" r="2" />
      <circle cx="18" cy="6" r="2" />
      <circle cx="12" cy="18" r="2" />
      <line
        x1="8"
        y1="6"
        x2="16"
        y2="6"
        stroke="currentColor"
        strokeWidth={2}
      />
      <line
        x1="12"
        y1="8"
        x2="12"
        y2="16"
        stroke="currentColor"
        strokeWidth={2}
      />
    </svg>
  );
}
