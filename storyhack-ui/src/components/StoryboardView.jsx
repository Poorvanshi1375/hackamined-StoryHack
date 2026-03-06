import { useState, useEffect } from "react";
import SceneCard from "./SceneCard.jsx";

const BASE_API = "http://localhost:8000";

/**
 * StoryboardView — Canva-style three-column layout.
 *   Left:   Vertical scene thumbnail sidebar
 *   Center + Right: SceneCard (image + controls)
 *
 * Props:
 *   scenes          — array of scene objects
 *   onSceneUpdated  — called after an edit to refresh storyboard
 *   selectedScenes  — array of included scene IDs
 *   onToggleScene   — toggle include/exclude
 *   sceneVoices     — { [sceneId]: voice } (centralized)
 *   onVoiceChange   — (sceneId, voice) => void
 */
export default function StoryboardView({
  scenes,
  onSceneUpdated,
  selectedScenes,
  onToggleScene,
  sceneVoices,
  onVoiceChange,
}) {
  const [activeSceneId, setActiveSceneId] = useState(null);

  useEffect(() => {
    if (scenes && scenes.length > 0 && !activeSceneId) {
      setActiveSceneId(scenes[0].scene_id);
    }
  }, [scenes, activeSceneId]);

  if (!scenes || scenes.length === 0) return null;

  const activeScene =
    scenes.find((s) => s.scene_id === activeSceneId) || scenes[0];

  return (
    <div
      className="flex gap-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
      style={{ minHeight: "560px" }}
    >
      {/* ── LEFT: Thumbnail Sidebar ── */}
      <div className="w-24 flex-shrink-0 border-r border-gray-200 bg-gray-50 overflow-y-auto flex flex-col gap-2 p-2">
        {scenes.map((scene, idx) => {
          const isIncluded = selectedScenes.includes(scene.scene_id);
          const isActive = scene.scene_id === activeSceneId;
          const imgSrc =
            `${BASE_API}/images/scene_${scene.scene_id}_v${scene.active_version ?? 1}.png?t=${Date.now()}`;

          return (
            <button
              key={scene.scene_id}
              onClick={() => setActiveSceneId(scene.scene_id)}
              className={`relative w-full aspect-square rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all cursor-pointer
                ${
                  isActive
                    ? "border-blue-500 shadow-md ring-2 ring-blue-200"
                    : "border-transparent hover:border-gray-300"
                }
                ${!isIncluded ? "opacity-40 grayscale" : ""}`}
            >
              {imgSrc ? (
                <img
                  src={imgSrc}
                  alt={`Scene ${scene.scene_id}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-400 font-medium">
                  ...
                </div>
              )}
              {/* Scene number */}
              <div className="absolute bottom-0.5 left-0.5 bg-black/60 text-white text-[9px] px-1 py-0.5 rounded font-bold">
                {idx + 1}
              </div>
              {/* Excluded badge */}
              {!isIncluded && (
                <div className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[8px] px-1 rounded font-bold">
                  ✕
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ── CENTER + RIGHT: SceneCard ── */}
      <div className="flex-1 p-5 overflow-y-auto">
        {activeScene && (
          <SceneCard
            key={activeScene.scene_id}
            scene={activeScene}
            onUpdated={onSceneUpdated}
            isSelected={selectedScenes.includes(activeScene.scene_id)}
            onToggle={() => onToggleScene(activeScene.scene_id)}
            voice={sceneVoices[activeScene.scene_id]}
            onVoiceChange={onVoiceChange}
          />
        )}
      </div>
    </div>
  );
}
