import { useState } from 'react'
import { startPipeline, getStoryboard, generateVideo } from './api.js'
import UploadPanel from './components/UploadPanel.jsx'
import StoryboardView from './components/StoryboardView.jsx'
import VideoPanel from './components/VideoPanel.jsx'

export default function App() {
  const [scenes, setScenes] = useState([])
  const [loadingPipeline, setLoadingPipeline] = useState(false)
  const [generatingVideo, setGeneratingVideo] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const [pipelineError, setPipelineError] = useState('')
  const [videoError, setVideoError] = useState('')

  // ── Start pipeline ──────────────────────────────────────────────────────
  async function handleGenerate(file, level) {
    setLoadingPipeline(true)
    setPipelineError('')
    setVideoReady(false)
    setScenes([])
    try {
      const data = await startPipeline(file, level)
      setScenes(data.scenes ?? [])
    } catch (err) {
      setPipelineError(err.message)
    } finally {
      setLoadingPipeline(false)
    }
  }

  // ── Scene edited — refresh the full storyboard from server ─────────────
  async function handleSceneUpdated() {
    try {
      const data = await getStoryboard()
      // Append a cache-bust timestamp so the browser re-fetches replaced images
      const ts = Date.now()
      setScenes(data.scenes.map((s) => ({ ...s, _ts: ts })))
    } catch {
      // Storyboard fetch failed — scenes already updated locally, no crash
    }
  }

  // ── Approve + generate video ────────────────────────────────────────────
  async function handleGenerateVideo() {
    setGeneratingVideo(true)
    setVideoError('')
    try {
      await generateVideo()
      setVideoReady(true)
    } catch (err) {
      setVideoError(err.message)
    } finally {
      setGeneratingVideo(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-1.5-3.75" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-none">StoryHack</h1>
            <p className="text-xs text-gray-400 mt-0.5">AI Video Storyboard Generator</p>
          </div>

          {/* Progress pills */}
          {scenes.length > 0 && (
            <div className="ml-auto flex items-center gap-2 text-xs">
              <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">✓ Storyboard</span>
              {videoReady && (
                <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">✓ Video ready</span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Upload */}
        <UploadPanel onGenerate={handleGenerate} loading={loadingPipeline} />

        {pipelineError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            ⚠️ {pipelineError}
          </div>
        )}

        {/* Loading overlay for pipeline */}
        {loadingPipeline && (
          <div className="bg-white rounded-2xl shadow-md p-8 flex flex-col items-center gap-4">
            <svg className="w-10 h-10 text-blue-400 spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M12 3a9 9 0 1 0 9 9" />
            </svg>
            <div className="text-center">
              <p className="font-semibold text-gray-700">Generating storyboard…</p>
              <p className="text-xs text-gray-400 mt-1">Scene generation → Grounding → Image generation</p>
            </div>
          </div>
        )}

        {/* Storyboard */}
        {scenes.length > 0 && (
          <StoryboardView scenes={scenes} onSceneUpdated={handleSceneUpdated} />
        )}

        {/* Video section — show only after storyboard exists */}
        {scenes.length > 0 && (
          <>
            <VideoPanel
              videoReady={videoReady}
              onGenerate={handleGenerateVideo}
              generating={generatingVideo}
            />
            {videoError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                ⚠️ {videoError}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="text-center py-6 text-xs text-gray-400">
        StoryHack · AI Video Pipeline · Hackathon Edition
      </footer>
    </div>
  )
}
