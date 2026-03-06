import { useState, useEffect, useRef } from "react";
import {
  editScene,
  getSceneVersions,
  setSceneVersion,
  imageUrl,
  getVoices,
  setSceneVoice,
} from "../api.js";

export default function SceneCard({ scene, onUpdated, isSelected, onToggle }) {
  const [editText, setEditText] = useState("");
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");

  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState("en-US-AriaNeural"); // Default
  const [previewState, setPreviewState] = useState("idle"); // idle | loading | playing
  const audioRef = useRef(null);

  // Fetch voices once
  useEffect(() => {
    getVoices()
      .then((data) => {
        if (data.voices) setVoices(data.voices);
      })
      .catch(console.error);
  }, []);

  async function handlePreviewAudio() {
    if (previewState !== "idle") return; // Prevent multiple clicks

    setPreviewState("loading");
    try {
      const BASE_API = "http://localhost:8000";
      const response = await fetch(
        `${BASE_API}/scenes/${scene.scene_id}/preview-audio`,
      );

      if (!response.ok) {
        throw new Error("Failed to generate audio");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => setPreviewState("idle");
      audio.onerror = () => setPreviewState("idle");

      setPreviewState("playing");
      await audio.play();
    } catch (err) {
      console.error("Preview audio error:", err);
      setPreviewState("idle");
    }
  }

  async function handlePreviewAudio() {
    if (previewState !== "idle") return; // Prevent multiple clicks

    setPreviewState("loading");
    try {
      const BASE_API = "http://localhost:8000";
      const response = await fetch(
        `${BASE_API}/scenes/${scene.scene_id}/preview-audio`,
      );

      if (!response.ok) {
        throw new Error("Failed to generate audio");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => setPreviewState("idle");
      audio.onerror = () => setPreviewState("idle");

      setPreviewState("playing");
      await audio.play();
    } catch (err) {
      console.error("Preview audio error:", err);
      setPreviewState("idle");
    }
  }

  // Version state
  const [availableVersions, setAvailableVersions] = useState([]);
  const [activeVersion, setActiveVersion] = useState(null);
  const [versionData, setVersionData] = useState({}); // {version: {title,script,visual_description,duration}}
  const [switchingTo, setSwitchingTo] = useState(null);
  const [versionError, setVersionError] = useState("");

  // Fetch available versions when the scene mounts / refreshes
  useEffect(() => {
    getSceneVersions(scene.scene_id)
      .then((data) => {
        setAvailableVersions(data.available_versions);
        setActiveVersion(data.active_version);
        setVersionData(data.version_data ?? {});
      })
      .catch(() => {});
  }, [scene.scene_id, scene._ts]);

  // ── Switch version ──────────────────────────────────────────────────────
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

  // Derive displayed content from the selected version (fallback to scene props)
  const vContent = (activeVersion && versionData[String(activeVersion)]) || {
    title: scene.title,
    script: scene.script,
    visual_description: scene.visual_description,
    duration: scene.duration,
  };

  // ── Apply edit ──────────────────────────────────────────────────────────
  async function handleEdit() {
    if (!editText.trim()) return;
    setEditing(true);
    setEditError("");
    try {
      await editScene(scene.scene_id, editText);
      setEditText("");
      onUpdated(); // triggers re-fetch which re-runs this card's useEffect too
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditing(false);
    }
  }

  // Build image URL:
  // - If we know the active version, construct the versioned path directly.
  // - Fall back to scene.image (from storyboard log) as a safety net.
  const BASE_API = "http://localhost:8000";
  const imgSrc = activeVersion
    ? `${BASE_API}/images/scene_${scene.scene_id}_v${activeVersion}.png?t=${scene._ts ?? 0}_v${activeVersion}`
    : scene.image && scene.image !== "N/A"
      ? `${BASE_API}/${scene.image}?t=${scene._ts ?? 0}`
      : null;

  return (
    <div
      className={`bg-white rounded-2xl shadow-md overflow-hidden flex flex-col transition-opacity duration-200 ${!isSelected ? "opacity-50 grayscale-[20%]" : "opacity-100"}`}
    >
      {/* ── Scene image ── */}
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={`Scene ${scene.scene_id}`}
          className="w-full h-52 object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <div className="w-full h-52 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <svg
            className="w-12 h-12 text-indigo-300"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M2.25 18h19.5M3.75 4.5h16.5A1.5 1.5 0 0 1 21.75 6v12a1.5 1.5 0 0 1-1.5 1.5H3.75A1.5 1.5 0 0 1 2.25 18V6A1.5 1.5 0 0 1 3.75 4.5z"
            />
          </svg>
        </div>
      )}

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* ── Header row ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={onToggle}
                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-xs font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
                Include in video
              </span>
            </label>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full ml-1">
              Scene {scene.scene_id}
            </span>
          </div>
          <span className="text-xs text-gray-400">⏱ {vContent.duration}s</span>
        </div>

        {/* ── Version selector ── */}
        {availableVersions.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Image version
            </p>
            <div className="flex flex-wrap gap-1.5">
              {availableVersions.map((v) => {
                const isActive = v === activeVersion;
                const isLoading = v === switchingTo;
                return (
                  <button
                    key={v}
                    onClick={() => handleVersionSwitch(v)}
                    disabled={isActive || switchingTo !== null}
                    title={isActive ? `v${v} — active` : `Switch to v${v}`}
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold border transition-all
                      ${
                        isLoading
                          ? "border-indigo-300 bg-indigo-50 text-indigo-400 cursor-wait"
                          : isActive
                            ? "border-indigo-500 bg-indigo-500 text-white cursor-default shadow-sm"
                            : "border-gray-200 bg-gray-50 text-gray-500 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 active:scale-95"
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
            {versionError && (
              <p className="text-xs text-red-500">{versionError}</p>
            )}
          </div>
        )}

        {/* ── Title ── */}
        <h3 className="font-semibold text-gray-800 text-sm leading-snug">
          {vContent.title}
        </h3>

        {/* ── Script ── */}
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-600 leading-relaxed border-l-2 border-blue-200 pl-3">
            {vContent.script}
          </p>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500 font-medium">VOICE:</span>
            <select
              value={selectedVoice}
              onChange={async (e) => {
                const v = e.target.value;
                setSelectedVoice(v);
                try {
                  await setSceneVoice(scene.scene_id, v);
                } catch (err) {
                  console.error("Voice set error", err);
                }
              }}
              disabled={voices.length === 0}
              className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-700 outline-none focus:border-indigo-400 font-medium cursor-pointer"
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
          </div>

          <button
            onClick={handlePreviewAudio}
            disabled={previewState !== "idle"}
            className={`self-start flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition-all border ${
              previewState === "loading"
                ? "bg-yellow-50 text-yellow-600 border-yellow-200 cursor-wait shadow-sm"
                : previewState === "playing"
                  ? "bg-green-50 text-green-600 border-green-200 shadow-inner"
                  : "bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100 hover:text-indigo-700 active:scale-95 shadow-sm"
            }`}
          >
            {previewState === "idle" && "🔊 Preview Audio"}
            {previewState === "loading" && "⏳ Generating..."}
            {previewState === "playing" && "▶ Playing"}
          </button>
        </div>

        {/* ── Visual description (collapsible) ── */}
        <details className="text-xs text-gray-400 cursor-pointer">
          <summary className="font-medium text-gray-500 hover:text-gray-700 transition-colors">
            Visual description
          </summary>
          <p className="mt-1 leading-relaxed">{vContent.visual_description}</p>
        </details>

        {/* ── Edit box ── */}
        <div className="mt-auto pt-2 border-t border-gray-100 space-y-2">
          <textarea
            rows={2}
            placeholder="Describe your edit (e.g. 'shorten this', 'add an example')…"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder-gray-300"
          />
          {editError && <p className="text-xs text-red-500">{editError}</p>}
          <button
            onClick={handleEdit}
            disabled={editing || !editText.trim()}
            className={`w-full py-1.5 text-sm font-medium rounded-lg transition-all
              ${
                editing || !editText.trim()
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white active:scale-[0.98]"
              }`}
          >
            {editing ? (
              <span className="flex items-center justify-center gap-1.5">
                <svg
                  className="w-3.5 h-3.5 spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" d="M12 3a9 9 0 1 0 9 9" />
                </svg>
                Applying…
              </span>
            ) : (
              "Apply Edit"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
