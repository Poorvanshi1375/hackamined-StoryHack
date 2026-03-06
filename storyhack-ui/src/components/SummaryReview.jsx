import { useState } from 'react'

/**
 * SummaryReview
 * Displays the AI-generated document summary and core focus.
 * User can refine them with natural language or approve to proceed to scene generation.
 *
 * Props:
 *   summary        {string}   Initial summary text
 *   coreFocus      {string}   Initial core focus text
 *   onRefine       {(summary, coreFocus, editRequest) => Promise<{summary,core_focus}>}
 *   onRegenerate   {() => void}  Triggers a full re-generation (handled by parent)
 *   onApprove      {(summary, coreFocus) => void}
 *   loading        {boolean}
 */
export default function SummaryReview({
  summary: initialSummary,
  coreFocus: initialCoreFocus,
  onRefine,
  onRegenerate,
  onApprove,
  loading,
}) {
  const [summary, setSummary] = useState(initialSummary)
  const [coreFocus, setCoreFocus] = useState(initialCoreFocus)
  const [showRefineBox, setShowRefineBox] = useState(false)
  const [refineText, setRefineText] = useState('')
  const [refining, setRefining] = useState(false)
  const [refineError, setRefineError] = useState('')

  // Keep local state in sync if parent re-generates a fresh summary
  if (initialSummary !== summary && !refining) {
    setSummary(initialSummary)
    setCoreFocus(initialCoreFocus)
  }

  async function handleRefine() {
    if (!refineText.trim()) return
    setRefining(true)
    setRefineError('')
    try {
      const updated = await onRefine(summary, coreFocus, refineText.trim())
      setSummary(updated.summary)
      setCoreFocus(updated.core_focus)
      setRefineText('')
      setShowRefineBox(false)
    } catch (err) {
      setRefineError(err.message)
    } finally {
      setRefining(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 space-y-5">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-gray-800">📋 Document Summary Review</h2>
        <p className="text-sm text-gray-500">
          Review and refine the summary and core focus before scene generation begins.
          <br />
          <span className="text-blue-600 font-medium">
            These guide the entire video — approve when you're happy.
          </span>
        </p>
      </div>

      {/* Summary textarea */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">Summary</label>
        <textarea
          rows={4}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
        />
      </div>

      {/* Core focus textarea */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">Core Focus</label>
        <textarea
          rows={2}
          value={coreFocus}
          onChange={(e) => setCoreFocus(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
        />
        <p className="text-xs text-gray-400">
          The single concept the explainer video should be built around.
        </p>
      </div>

      {/* Refine input */}
      {showRefineBox && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            What would you like to change?
          </label>
          <textarea
            rows={2}
            placeholder='e.g. "Shorten the summary and focus more on the algorithm"'
            value={refineText}
            onChange={(e) => setRefineText(e.target.value)}
            className="w-full border border-blue-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            autoFocus
          />
          {refineError && (
            <p className="text-xs text-red-500">⚠️ {refineError}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleRefine}
              disabled={refining || !refineText.trim()}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all
                ${refining || !refineText.trim()
                  ? 'bg-blue-200 text-white cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
            >
              {refining ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" d="M12 3a9 9 0 1 0 9 9" />
                  </svg>
                  Refining…
                </span>
              ) : 'Apply Refinement'}
            </button>
            <button
              onClick={() => { setShowRefineBox(false); setRefineText(''); setRefineError('') }}
              className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 pt-1">
        {!showRefineBox && (
          <button
            onClick={() => setShowRefineBox(true)}
            disabled={loading || refining}
            className="flex-1 min-w-[120px] py-2.5 rounded-xl text-sm font-semibold border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✏️ Refine Summary
          </button>
        )}

        <button
          onClick={onRegenerate}
          disabled={loading || refining}
          className="flex-1 min-w-[120px] py-2.5 rounded-xl text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🔄 Regenerate
        </button>

        <button
          onClick={() => onApprove(summary, coreFocus)}
          disabled={loading || refining}
          className={`flex-1 min-w-[120px] py-2.5 rounded-xl text-sm font-semibold transition-all
            ${loading || refining
              ? 'bg-green-200 text-white cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white shadow-sm active:scale-[0.98]'}`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" d="M12 3a9 9 0 1 0 9 9" />
              </svg>
              Generating scenes…
            </span>
          ) : '✅ Approve & Generate Scenes'}
        </button>
      </div>
    </div>
  )
}
