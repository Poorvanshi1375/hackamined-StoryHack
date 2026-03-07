import { useState, useEffect, useRef } from "react";
import {
  editScene,
  getSceneVersions,
  setSceneVersion,
  getVoices,
  setSceneVoice,
} from "../api.js";

const BASE_API = "http://localhost:8000";

/**
 * SceneCard — Canva-style two-column scene workspace.
 * Props:
 *  scene        — scene data object
 *  onUpdated    — callback to trigger storyboard refresh
 *  isSelected   — whether this scene is included in video
 *  onToggle     — toggle include/exclude
 *  voice        — currently selected voice (from parent centralized state)
 *  onVoiceChange — callback(sceneId, voice)
 */
export default function SceneCard({
  scene,
  onUpdated,
  isSelected,
  onToggle,
  voice,
  onVoiceChange,
}) {
  const [editText, setEditText] = useState("");
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");

  const [voices, setVoices] = useState([]);
  const [previewState, setPreviewState] = useState("idle"); // idle | loading | playing | paused
  const audioRef = useRef(null);

  // Fetch available voices once
  useEffect(() => {
    getVoices()
      .then((data) => {
        if (data.voices) setVoices(data.voices);
      })
      .catch(console.error);
  }, []);

  async function handlePreviewAudio() {
    try {
      if (!audioRef.current) {
        setPreviewState("loading");

        const response = await fetch(
          `${BASE_API}/scenes/${scene.scene_id}/preview-audio`,
        );

        if (!response.ok) throw new Error("Failed to generate audio");

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const audio = new Audio(url);

        audio.onended = () => setPreviewState("idle");
        audio.onerror = () => setPreviewState("idle");

        audioRef.current = audio;

        await audio.play();
        setPreviewState("playing");

        return;
      }

      const audio = audioRef.current;

      if (audio.paused) {
        await audio.play();
        setPreviewState("playing");
      } else {
        audio.pause();
        setPreviewState("paused");
      }
    } catch (err) {
      console.error("Preview audio error:", err);
      setPreviewState("idle");
    }
  }

  function restartAudio() {
    if (!audioRef.current) return;

    audioRef.current.currentTime = 0;
    audioRef.current.play();
    setPreviewState("playing");
  }

  // ── Version state ──────────────────────────────────────────────────────────
  const [availableVersions, setAvailableVersions] = useState([]);
  const [activeVersion, setActiveVersion] = useState(null);
  const [versionData, setVersionData] = useState({});
  const [switchingTo, setSwitchingTo] = useState(null);
  const [versionError, setVersionError] = useState("");

  useEffect(() => {
    getSceneVersions(scene.scene_id)
      .then((data) => {
        setAvailableVersions(data.available_versions);
        setActiveVersion(data.active_version);
        setVersionData(data.version_data ?? {});
      })
      .catch(() => {});
  }, [scene.scene_id, scene._ts]);

  async function handleVersionSwitch(version) {
    if (version === activeVersion || switchingTo !== null) return;
    setSwitchingTo(version);
    setVersionError("");
    try {
      await setSceneVersion(scene.scene_id, version);
      setActiveVersion(version);
      onUpdated();
    } catch (err) {
      setVersionError(err.message);
    } finally {
      setSwitchingTo(null);
    }
  }

  // Derive displayed content from active version or fallback to scene props
  const vContent = (activeVersion && versionData[String(activeVersion)]) || {
    title: scene.title,
    script: scene.script,
    visual_description: scene.visual_description,
    duration: scene.duration,
  };

  // ── Apply scene edit ────────────────────────────────────────────────────────
  async function handleEdit() {
    if (!editText.trim()) return;
    setEditing(true);
    setEditError("");
    try {
      await editScene(scene.scene_id, editText);
      setEditText("");
      onUpdated();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditing(false);
    }
  }

  // Cache-busted image URL
  const imgSrc = activeVersion
    ? `${BASE_API}/images/scene_${scene.scene_id}_v${activeVersion}.png?t=${scene._ts ?? 0}`
    : scene.image && scene.image !== "N/A"
      ? `${BASE_API}/${scene.image}?t=${scene._ts ?? 0}`
      : null;

  const selectedVoice = voice || "en-US-AriaNeural";

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 items-start h-full">
      {/* ── CENTER: Square Image ── */}
      <div className="relative w-full aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-200 shadow-inner flex items-center justify-center">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={`Scene ${scene.scene_id}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="text-gray-400 text-xs font-medium tracking-wide">
            Generating Image...
          </div>
        )}

        {/* Version pills — do not redesign per instructions */}
        {availableVersions.length > 0 && (
          <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
            {availableVersions.map((v) => {
              const isActive = v === activeVersion;
              const isLoading = v === switchingTo;
              return (
                <button
                  key={v}
                  onClick={() => handleVersionSwitch(v)}
                  disabled={isActive || switchingTo !== null}
                  title={isActive ? `v${v} — active` : `Switch to v${v}`}
                  className={`text-[11px] px-2.5 py-1 rounded-full font-bold shadow-sm border transition-all
                    ${
                      isLoading
                        ? "bg-indigo-50 text-indigo-400 border-indigo-200 cursor-wait"
                        : isActive
                          ? "bg-blue-600 text-white border-blue-600 cursor-default"
                          : "bg-white text-gray-600 border-gray-300 hover:bg-blue-50 hover:border-blue-300 active:scale-95"
                    }`}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-1">
                      <svg
                        className="w-2.5 h-2.5 spin"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" d="M12 3a9 9 0 1 0 9 9" />
                      </svg>
                      v{v}
                    </span>
                  ) : (
                    <>
                      v{v}
                      {isActive && " ✓"}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        )}
        {versionError && (
          <div className="absolute bottom-2 left-2 text-[11px] text-red-600 bg-white/90 px-2 py-1 rounded-lg font-medium shadow-sm border border-red-100">
            {versionError}
          </div>
        )}
      </div>

      {/* ── RIGHT: Scene Control Panel ── */}
      <div className="flex flex-col gap-4 overflow-y-auto max-h-[600px] pr-1">
        {/* Title */}
        <h3 className="text-lg font-bold text-gray-900 leading-tight">
          {vContent.title || `Scene ${scene.scene_id}`}
        </h3>

        {/* Include in video checkbox */}
        <label className="flex items-center gap-2.5 cursor-pointer w-fit group">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggle}
            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
          />
          <span className="text-sm font-semibold text-gray-700 group-hover:text-blue-600 transition-colors">
            Include in final video
          </span>
        </label>

        <hr className="border-gray-100" />

        {/* Narration Script */}
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Narration Script
          </p>
          <p className="text-sm text-gray-700 leading-relaxed bg-blue-50/60 border border-blue-100 rounded-lg px-3 py-2.5 italic">
            "{vContent.script}"
          </p>
        </div>

        {/* Voice + Preview */}
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Voice
          </p>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <select
                value={selectedVoice}
                onChange={async (e) => {
                  const v = e.target.value;
                  onVoiceChange(scene.scene_id, v);
                  try {
                    await setSceneVoice(scene.scene_id, v);
                  } catch (err) {
                    console.error("Voice set error", err);
                  }
                }}
                disabled={voices.length === 0}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 cursor-pointer shadow-sm appearance-none"
              >
                {voices.map((v) => (
                  <option key={v} value={v}>
                    {v
                      .replace("en-US-", "")
                      .replace("en-GB-", "")
                      .replace("Neural", "")}{" "}
                    ({v})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Play / Pause */}
              <button
                onClick={handlePreviewAudio}
                className="w-9 h-9 flex items-center justify-center rounded-lg border shadow-sm
      bg-white text-blue-600 border-gray-200 hover:bg-blue-50"
              >
                {previewState === "loading" && "⏳"}
                {previewState === "playing" && "⏸"}
                {(previewState === "paused" || previewState === "idle") && "▶"}
              </button>

              {/* Restart */}
              <button
                onClick={restartAudio}
                disabled={!audioRef.current}
                className="w-9 h-9 flex items-center justify-center rounded-lg border shadow-sm
      bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              >
                ⟲
              </button>
            </div>
          </div>
        </div>

        {/* Visual Description (collapsible) */}
        <details className="group border border-gray-200 rounded-lg bg-gray-50 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex items-center justify-between px-3 py-2 cursor-pointer outline-none">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Visual Description
            </span>
            <svg
              className="w-3.5 h-3.5 text-gray-400 transition-transform group-open:rotate-180"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </summary>
          <p className="px-3 pb-3 pt-1 text-xs text-gray-600 leading-relaxed border-t border-gray-200">
            {vContent.visual_description}
          </p>
        </details>

        {/* Scene Edit Prompt */}
        <div className="space-y-2 pt-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Scene Edit Prompt
          </p>
          <textarea
            rows={2}
            placeholder="e.g., 'Shorten this scene', 'add a diagram'"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
          />
          {editError && (
            <p className="text-xs text-red-500 font-medium">{editError}</p>
          )}
          <button
            onClick={handleEdit}
            disabled={editing || !editText.trim()}
            className={`w-full py-2 text-sm font-semibold rounded-lg transition-all shadow-sm
              ${
                editing || !editText.trim()
                  ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]"
              }`}
          >
            {editing ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="w-3.5 h-3.5 spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" d="M12 3a9 9 0 1 0 9 9" />
                </svg>
                Regenerating...
              </span>
            ) : (
              "Regenerate Scene"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
