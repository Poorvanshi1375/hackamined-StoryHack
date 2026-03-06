import { VIDEO_URL } from '../api.js'

export default function VideoPanel({ videoReady, onGenerate, generating }) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-6 space-y-5">
      <h2 className="text-lg font-semibold text-gray-700">🎥 Generate Video</h2>

      {!videoReady ? (
        <div className="flex flex-col items-center gap-4 py-4">
          <p className="text-sm text-gray-500 text-center">
            Once you're happy with the storyboard, generate the final explainer video.
          </p>
          <button
            onClick={onGenerate}
            disabled={generating}
            className={`px-8 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm
              ${generating
                ? 'bg-green-200 text-white cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white active:scale-[0.98]'}`}
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" d="M12 3a9 9 0 1 0 9 9" />
                </svg>
                Rendering video…
              </span>
            ) : '🎬 Generate Final Video'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Player */}
          <video
            controls
            className="w-full rounded-xl shadow-inner bg-black"
            src={VIDEO_URL}
          >
            Your browser does not support video playback.
          </video>

          {/* Download */}
          <a
            href={VIDEO_URL}
            download="output_video.mp4"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium transition-all active:scale-[0.98]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download Video
          </a>
        </div>
      )}
    </div>
  )
}
