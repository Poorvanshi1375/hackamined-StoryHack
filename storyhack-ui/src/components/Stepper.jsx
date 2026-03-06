/**
 * Stepper.jsx — Reusable horizontal step progress bar.
 * Props: steps (string[]), currentIndex (number)
 */
export default function Stepper({ steps, currentIndex }) {
  return (
    <div className="flex items-center w-full max-w-lg mx-auto">
      {steps.map((label, idx) => {
        const isCompleted = idx < currentIndex;
        const isActive = idx === currentIndex;
        const isFuture = idx > currentIndex;

        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            {/* Circle + label */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors
                  ${
                    isCompleted
                      ? "bg-green-500 border-green-500 text-white"
                      : isActive
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white border-gray-300 text-gray-400"
                  }`}
              >
                {isCompleted ? (
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={`text-[11px] font-medium leading-none whitespace-nowrap
                  ${isCompleted ? "text-green-600" : isActive ? "text-blue-600" : "text-gray-400"}`}
              >
                {label}
              </span>
            </div>

            {/* Connector line */}
            {idx < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 mt-[-10px] transition-colors
                ${isCompleted ? "bg-green-400" : "bg-gray-200"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
