import { useState } from 'react'
import { editScene, imageUrl } from '../api.js'

export default function SceneCard({ scene, onUpdated }) {
  const [editText, setEditText] = useState('')
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')

  async function handleEdit() {
    if (!editText.trim()) return
    setEditing(true)
    setError('')
    try {
      await editScene(scene.scene_id, editText)
      setEditText('')
      onUpdated() // tell App to re-fetch storyboard from server
    } catch (err) {
      setError(err.message)
    } finally {
      setEditing(false)
    }
  }

  // Append cache-buster so the browser re-fetches the regenerated image
  const imgSrc = scene.image && scene.image !== 'N/A'
    ? `${imageUrl(scene.image)}?t=${scene._ts ?? 0}`
    : null

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden flex flex-col">
      {/* Scene image */}
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={`Scene ${scene.scene_id}`}
          className="w-full h-52 object-cover"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
      ) : (
        <div className="w-full h-52 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <svg className="w-12 h-12 text-indigo-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M2.25 18h19.5M3.75 4.5h16.5A1.5 1.5 0 0 1 21.75 6v12a1.5 1.5 0 0 1-1.5 1.5H3.75A1.5 1.5 0 0 1 2.25 18V6A1.5 1.5 0 0 1 3.75 4.5z" />
          </svg>
        </div>
      )}

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
            Scene {scene.scene_id}
          </span>
          <span className="text-xs text-gray-400">⏱ {scene.duration}s</span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-gray-800 text-sm leading-snug">{scene.title}</h3>

        {/* Script */}
        <p className="text-sm text-gray-600 leading-relaxed border-l-2 border-blue-200 pl-3">
          {scene.script}
        </p>

        {/* Visual description */}
        <details className="text-xs text-gray-400 cursor-pointer">
          <summary className="font-medium text-gray-500 hover:text-gray-700 transition-colors">Visual description</summary>
          <p className="mt-1 leading-relaxed">{scene.visual_description}</p>
        </details>

        {/* Edit box */}
        <div className="mt-auto pt-2 border-t border-gray-100 space-y-2">
          <textarea
            rows={2}
            placeholder="Describe your edit (e.g. 'shorten this', 'add an example')…"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder-gray-300"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            onClick={handleEdit}
            disabled={editing || !editText.trim()}
            className={`w-full py-1.5 text-sm font-medium rounded-lg transition-all
              ${editing || !editText.trim()
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-[0.98]'}`}
          >
            {editing ? (
              <span className="flex items-center justify-center gap-1.5">
                <svg className="w-3.5 h-3.5 spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" d="M12 3a9 9 0 1 0 9 9" />
                </svg>
                Applying…
              </span>
            ) : 'Apply Edit'}
          </button>
        </div>
      </div>
    </div>
  )
}
