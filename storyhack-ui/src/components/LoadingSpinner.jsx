// `spin` is a keyframe animation defined in the global stylesheet (index.css / tailwind config).
export default function LoadingSpinner({ color = "text-blue-400", size = "w-8 h-8" }) {
  return (
    <svg
      className={`${size} ${color} spin`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}
