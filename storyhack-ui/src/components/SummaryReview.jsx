import { useState } from "react";

export default function SummaryReview({
  summary: initialSummary,
  coreFocus: initialCoreFocus,
  onRefine,
  onRegenerate,
  onApprove,
  loading,
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [coreFocus, setCoreFocus] = useState(initialCoreFocus);
  const [refineText, setRefineText] = useState("");
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState("");

  if (initialSummary !== summary && !refining) {
    setSummary(initialSummary);
    setCoreFocus(initialCoreFocus);
  }

  async function handleRefine() {
    if (!refineText.trim()) return;
    setRefining(true);
    setRefineError("");
    try {
      const updated = await onRefine(summary, coreFocus, refineText.trim());
      setSummary(updated.summary);
      setCoreFocus(updated.core_focus);
      setRefineText("");
    } catch (err) {
      setRefineError(err.message);
    } finally {
      setRefining(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-8 mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Document Summary</h2>
        <p className="text-gray-500 text-sm">
          Review and edit the generated summary and core focus. These guide the
          entire video.
        </p>
      </div>

      {/* Summary textarea */}
      <div className="space-y-2">
        <label className="block text-sm font-bold text-gray-700">Summary</label>
        <textarea
          rows={6}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm resize-none"
        />
      </div>

      {/* Core focus textarea */}
      <div className="space-y-2">
        <label className="block text-sm font-bold text-gray-700">
          Core Focus
        </label>
        <textarea
          rows={3}
          value={coreFocus}
          onChange={(e) => setCoreFocus(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm resize-none"
        />
      </div>

      <hr className="border-gray-200" />

      {/* Refine Section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-700">
            Need adjustments? Ask AI to refine:
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder='e.g. "Shorten the summary and focus more on the algorithm"'
              value={refineText}
              onChange={(e) => setRefineText(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRefine();
              }}
            />
            <button
              onClick={handleRefine}
              disabled={refining || !refineText.trim() || loading}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors
                ${
                  refining || !refineText.trim() || loading
                    ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                    : "bg-white text-blue-600 border border-blue-600 hover:bg-blue-50 shadow-sm"
                }`}
            >
              {refining ? "Refining..." : "Refine with AI"}
            </button>
          </div>
          {refineError && (
            <p className="text-sm text-red-500 font-medium">⚠️ {refineError}</p>
          )}
        </div>
      </div>

      {/* Bottom Action buttons */}
      <div className="pt-4 flex justify-end gap-4">
        <button
          onClick={() => onApprove(summary, coreFocus)}
          disabled={loading || refining}
          className={`px-8 py-3 rounded-lg text-base font-semibold shadow-sm transition-all
            ${
              loading || refining
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white active:scale-95"
            }`}
        >
          {loading ? "Generating scenes..." : "Approve & Continue"}
        </button>
      </div>
    </div>
  );
}
