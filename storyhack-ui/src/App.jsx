import { useState } from "react";
import {
  generateSummary,
  refineSummary,
  approveSummary,
  getStoryboard,
  generateVideo,
} from "./api.js";
import Stepper from "./components/Stepper.jsx";
import UploadPanel from "./components/UploadPanel.jsx";
import SummaryReview from "./components/SummaryReview.jsx";
import StoryboardView from "./components/StoryboardView.jsx";
import VideoPanel from "./components/VideoPanel.jsx";
import LoadingSpinner from "./components/LoadingSpinner.jsx";

// Stages: 'upload' | 'summary' | 'scenes' | 'video'
const STAGES = {
  UPLOAD: "upload",
  SUMMARY: "summary",
  SCENES: "scenes",
  VIDEO: "video",
};

const STEP_LABELS = ["Upload", "Summary", "Scenes", "Video"];
const STAGE_TO_STEP = {
  [STAGES.UPLOAD]: 0,
  [STAGES.SUMMARY]: 1,
  [STAGES.SCENES]: 2,
  [STAGES.VIDEO]: 3,
};

export default function App() {
  const [stage, setStage] = useState(STAGES.UPLOAD);

  // Per-stage state
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedLevel, setUploadedLevel] = useState("basic");

  const [summary, setSummary] = useState("");
  const [coreFocus, setCoreFocus] = useState("");

  const [scenes, setScenes] = useState([]);
  // selectedScenes: array of scene IDs that are included in video
  const [selectedScenes, setSelectedScenes] = useState([]);

  // ── Centralized per-scene state ─────────────────────────────────────────────
  // sceneVoices: { [sceneId]: voiceString }
  const [sceneVoices, setSceneVoices] = useState({});

  function handleVoiceChange(sceneId, voice) {
    setSceneVoices((prev) => ({ ...prev, [sceneId]: voice }));
  }

  // Loading / error per phase
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingScenes, setLoadingScenes] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [scenesError, setScenesError] = useState("");
  const [videoError, setVideoError] = useState("");

  // ── Stage 1: Upload → generate summary ─────────────────────────────────────
  async function handleUpload(file, level) {
    setUploadedFile(file);
    setUploadedLevel(level);
    setLoadingSummary(true);
    setSummaryError("");
    setSummary("");
    setCoreFocus("");
    setScenes([]);
    setSelectedScenes([]);
    setSceneVoices({});
    try {
      const data = await generateSummary(file, level);
      setSummary(data.summary);
      setCoreFocus(data.core_focus);
      setStage(STAGES.SUMMARY);
    } catch (err) {
      setSummaryError(err.message);
    } finally {
      setLoadingSummary(false);
    }
  }

  // ── Stage 2a: Refine summary ────────────────────────────────────────────────
  async function handleRefine(currentSummary, currentFocus, editRequest) {
    const data = await refineSummary(currentSummary, currentFocus, editRequest);
    setSummary(data.summary);
    setCoreFocus(data.core_focus);
    return data;
  }

  // ── Stage 2b: Regenerate summary ───────────────────────────────────────────
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

  // ── Stage 2c: Approve summary → run scene pipeline ─────────────────────────
  async function handleApproveSummary(approvedSummary, approvedFocus) {
    setLoadingScenes(true);
    setScenesError("");
    try {
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

  // ── Stage 3a: Scene edited — refresh storyboard ────────────────────────────
  async function handleSceneUpdated() {
    try {
      const data = await getStoryboard();
      const ts = Date.now();
      setScenes(data.scenes.map((s) => ({ ...s, _ts: ts })));
    } catch {
      // Storyboard fetch failed silently
    }
  }

  // ── Stage 3b: Toggle scene selection ───────────────────────────────────────
  function handleToggleSceneSelection(sceneId) {
    setSelectedScenes((prev) =>
      prev.includes(sceneId)
        ? prev.filter((id) => id !== sceneId)
        : [...prev, sceneId],
    );
  }

  // ── Stage 3c: Generate video ────────────────────────────────────────────────
  async function handleGenerateVideo() {
    setGeneratingVideo(true);
    setVideoError("");
    try {
      // Filter excluded scenes before sending to API
      const includedScenes = scenes.filter((s) =>
        selectedScenes.includes(s.scene_id),
      );
      await generateVideo(includedScenes, {}, selectedScenes);
      setStage(STAGES.VIDEO);
    } catch (err) {
      setVideoError(err.message);
    } finally {
      setGeneratingVideo(false);
    }
  }

  const currentStepIndex = STAGE_TO_STEP[stage] ?? 0;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-screen-xl mx-auto px-6 py-3 flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
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
              <h1 className="text-sm font-bold text-gray-900 leading-none">
                StoryHack
              </h1>
              <p className="text-[10px] text-gray-400 mt-0.5">
                AI Video Pipeline
              </p>
            </div>
          </div>

          {/* Stepper — centered */}
          <div className="flex-1 flex justify-center">
            <Stepper steps={STEP_LABELS} currentIndex={currentStepIndex} />
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 max-w-screen-xl mx-auto w-full px-6 py-6 space-y-4">
        {/* ── Stage: Upload ── */}
        {stage === STAGES.UPLOAD && (
          <>
            <UploadPanel onGenerate={handleUpload} loading={loadingSummary} />
            {loadingSummary && (
              <div className="bg-white rounded-xl border border-gray-200 p-8 flex flex-col items-center gap-3">
                <LoadingSpinner color="text-purple-400" />
                <p className="text-sm font-semibold text-gray-700">
                  Analysing document…
                </p>
                <p className="text-xs text-gray-400">
                  Generating summary and core focus
                </p>
              </div>
            )}
            {summaryError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                ⚠️ {summaryError}
              </div>
            )}
          </>
        )}

        {/* ── Stage: Summary Review ── */}
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
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                ⚠️ {scenesError || summaryError}
              </div>
            )}
            {loadingScenes && (
              <div className="bg-white rounded-xl border border-gray-200 p-8 flex flex-col items-center gap-3">
                <LoadingSpinner />
                <p className="text-sm font-semibold text-gray-700">
                  Generating storyboard…
                </p>
                <p className="text-xs text-gray-400">
                  Scene generation → Grounding → Image generation
                </p>
              </div>
            )}
          </>
        )}

        {/* ── Stage: Scenes ── */}
        {stage === STAGES.SCENES && (
          <>
            {scenes.length > 0 && (
              <StoryboardView
                scenes={scenes}
                onSceneUpdated={handleSceneUpdated}
                selectedScenes={selectedScenes}
                onToggleScene={handleToggleSceneSelection}
                sceneVoices={sceneVoices}
                onVoiceChange={handleVoiceChange}
              />
            )}
            {/* Generate Video button on scene screen */}
            <div className="flex justify-end gap-3">
              {videoError && (
                <span className="text-sm text-red-600 self-center font-medium">
                  ⚠️ {videoError}
                </span>
              )}
              <button
                onClick={handleGenerateVideo}
                disabled={generatingVideo || selectedScenes.length === 0}
                className={`px-5 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all
                  ${
                    generatingVideo || selectedScenes.length === 0
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700 text-white active:scale-95"
                  }`}
              >
                {generatingVideo ? (
                  <span className="flex items-center gap-2">
                    <LoadingSpinner size="w-3.5 h-3.5" />
                    Rendering…
                  </span>
                ) : (
                  "Generate Video →"
                )}
              </button>
            </div>
          </>
        )}

        {/* ── Stage: Video ── */}
        {stage === STAGES.VIDEO && <VideoPanel />}
      </main>

      {/* ── Footer ── */}
      <footer className="text-center py-4 text-xs text-gray-400">
        StoryHack · AI Video Pipeline · Hackathon Edition
      </footer>
    </div>
  );
}
