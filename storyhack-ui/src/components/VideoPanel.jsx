import { useRef } from "react";
import { VIDEO_URL } from "../api.js";

/**
 * VideoPanel — standalone full-screen video preview.
 * Shown only when stage === 'video'.
 */
export default function VideoPanel() {
  const videoRef = useRef(null);

  return (
    <div className="flex flex-col items-center justify-center py-8 gap-6 max-w-2xl mx-auto w-full">
      <video
        ref={videoRef}
        controls
        className="w-full rounded-xl bg-black border border-gray-200 shadow-md"
        src={VIDEO_URL}
      >
        Your browser does not support video playback.
      </video>

      <div className="flex gap-4 w-full">
        <button
          onClick={() => videoRef.current?.play()}
          className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-all active:scale-95"
        >
          Play
        </button>
        <a
          href={VIDEO_URL}
          download="output_video.mp4"
          className="flex-1 py-2 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold shadow-sm transition-all active:scale-95"
        >
          Download
        </a>
      </div>
    </div>
  );
}
