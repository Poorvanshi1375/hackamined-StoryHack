import { useState } from "react";
import {
  generateSummary,
  refineSummary,
  approveSummary,
  getStoryboard,
  generateVideo,
} from "./api.js";
import UploadPanel from "./components/UploadPanel.jsx";
import SummaryReview from "./components/SummaryReview.jsx";
import StoryboardView from "./components/StoryboardView.jsx";
import VideoPanel from "./components/VideoPanel.jsx";

// Stages: 'upload' | 'summary' | 'scenes' | 'video'
const STAGES = { UPLOAD: "upload", SUMMARY: "summary", SCENES: "scenes" };

export default function App() {
  const [stage, setStage] = useState(STAGES.UPLOAD);

  // Per-stage state
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedLevel, setUploadedLevel] = useState("basic");
  const [documentText, setDocumentText] = useState(""); // cached from server

  const [summary, setSummary] = useState("");
  const [coreFocus, setCoreFocus] = useState("");

  const [scenes, setScenes] = useState([]);
  const [selectedScenes, setSelectedScenes] = useState([]); // Array of selected scene IDs
  const [videoReady, setVideoReady] = useState(false);

  // Loading / error per phase
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingScenes, setLoadingScenes] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [scenesError, setScenesError] = useState("");
  const [videoError, setVideoError] = useState("");

  // ── Stage 1: Upload → generate summary ────────────────────────────────────
  async function handleUpload(file, level) {
    setUploadedFile(file);
    setUploadedLevel(level);
    setLoadingSummary(true);
    setSummaryError("");
    setSummary("");
    setCoreFocus("");
    setScenes([]);
    setSelectedScenes([]);
    setVideoReady(false);
    try {
      const data = await generateSummary(file, level);
      setSummary(data.summary);
      setCoreFocus(data.core_focus);
      // The API stores doc text in pipeline_state; we also need it for /approve.
      // We send an empty string — the server uses its own pipeline_state copy.
      // Store a sentinel so approve knows the server has the doc already.
      setDocumentText("__server_cached__");
      setStage(STAGES.SUMMARY);
    } catch (err) {
      setSummaryError(err.message);
    } finally {
      setLoadingSummary(false);
    }
  }

  // ── Stage 2a: Refine summary ───────────────────────────────────────────────
  async function handleRefine(currentSummary, currentFocus, editRequest) {
    const data = await refineSummary(currentSummary, currentFocus, editRequest);
    setSummary(data.summary);
    setCoreFocus(data.core_focus);
    return data;
  }

  // ── Stage 2b: Regenerate summary (re-upload same file) ────────────────────
  async function handleRegenerate() {
    if (!uploadedFile) return;
    setLoadingSummary(true);
    setSummaryError("");
    try {
      const data = await generateSummary(uploadedFile, uploadedLevel);
      setSummary(data.summary);
      setCoreFocus(data.core_focus);
    } catch (err) {
      setSummaryError(err.message);
    } finally {
      setLoadingSummary(false);
    }
  }

  // ── Stage 2c: Approve summary → run scene pipeline ────────────────────────
  async function handleApproveSummary(approvedSummary, approvedFocus) {
    setLoadingScenes(true);
    setScenesError("");
    try {
      // Server already has the document text — pass empty string as placeholder;
      // the /summary/approve endpoint uses pipeline_state.document set by /generate.
      const data = await approveSummary(
        "",
        approvedSummary,
        approvedFocus,
        uploadedLevel,
      );
      setScenes(data.scenes ?? []);
      if (data.scenes) {
        setSelectedScenes(data.scenes.map((s) => s.scene_id));
      }
      setStage(STAGES.SCENES);
    } catch (err) {
      setScenesError(err.message);
    } finally {
      setLoadingScenes(false);
    }
  }

  // ── Stage 3a: Scene edited — refresh storyboard ───────────────────────────
  async function handleSceneUpdated() {
    try {
      const data = await getStoryboard();
      const ts = Date.now();
      setScenes(data.scenes.map((s) => ({ ...s, _ts: ts })));
    } catch {
      // Storyboard fetch failed — scenes already updated locally, no crash
    }
  }

  // ── Stage 3b: Toggle scene selection ────────────────────────────────────
  function handleToggleSceneSelection(sceneId) {
    setSelectedScenes((prev) =>
      prev.includes(sceneId)
        ? prev.filter((id) => id !== sceneId)
        : [...prev, sceneId],
    );
  }

  // ── Stage 3c: Generate video ──────────────────────────────────────────────
  async function handleGenerateVideo() {
    setGeneratingVideo(true);
    setVideoError("");
    try {
      // images mapping is handled server-side now (from cache), but model requires dict
      await generateVideo(scenes, {}, selectedScenes);
      setVideoReady(true);
    } catch (err) {
      setVideoError(err.message);
    } finally {
      setGeneratingVideo(false);
    }
  }

  // ── Progress pill labels ───────────────────────────────────────────────────
  const pills = [];
  if (stage === STAGES.SUMMARY || stage === STAGES.SCENES)
    pills.push({ label: "✓ Summary", color: "bg-purple-100 text-purple-700" });
  if (stage === STAGES.SCENES)
    pills.push({ label: "✓ Storyboard", color: "bg-blue-100 text-blue-700" });
  if (videoReady)
    pills.push({
      label: "✓ Video ready",
      color: "bg-green-100 text-green-700",
    });

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-1.5-3.75"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-none">
              StoryHack
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              AI Video Storyboard Generator
            </p>
          </div>

          {/* Progress pills */}
          {pills.length > 0 && (
            <div className="ml-auto flex items-center gap-2 text-xs">
              {pills.map((p) => (
                <span
                  key={p.label}
                  className={`${p.color} px-2.5 py-1 rounded-full font-medium`}
                >
                  {p.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* ── Stage 1: Upload ── */}
        {stage === STAGES.UPLOAD && (
          <>
            <UploadPanel onGenerate={handleUpload} loading={loadingSummary} />
            {loadingSummary && (
              <div className="bg-white rounded-2xl shadow-md p-8 flex flex-col items-center gap-4">
                <svg
                  className="w-10 h-10 text-purple-400 spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" d="M12 3a9 9 0 1 0 9 9" />
                </svg>
                <div className="text-center">
                  <p className="font-semibold text-gray-700">
                    Analysing document…
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Generating summary and core focus
                  </p>
                </div>
              </div>
            )}
            {summaryError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                ⚠️ {summaryError}
              </div>
            )}
          </>
        )}

        {/* ── Stage 2: Summary Review ── */}
        {stage === STAGES.SUMMARY && (
          <>
            <SummaryReview
              summary={summary}
              coreFocus={coreFocus}
              onRefine={handleRefine}
              onRegenerate={handleRegenerate}
              onApprove={handleApproveSummary}
              loading={loadingScenes || loadingSummary}
            />
            {(scenesError || summaryError) && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                ⚠️ {scenesError || summaryError}
              </div>
            )}
            {loadingScenes && (
              <div className="bg-white rounded-2xl shadow-md p-8 flex flex-col items-center gap-4">
                <svg
                  className="w-10 h-10 text-blue-400 spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" d="M12 3a9 9 0 1 0 9 9" />
                </svg>
                <div className="text-center">
                  <p className="font-semibold text-gray-700">
                    Generating storyboard…
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Scene generation → Grounding → Image generation
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Stage 3: Scenes + Video ── */}
        {stage === STAGES.SCENES && (
          <>
            {scenes.length > 0 && (
              <StoryboardView
                scenes={scenes}
                onSceneUpdated={handleSceneUpdated}
                selectedScenes={selectedScenes}
                onToggleScene={handleToggleSceneSelection}
              />
            )}
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
  );
}
