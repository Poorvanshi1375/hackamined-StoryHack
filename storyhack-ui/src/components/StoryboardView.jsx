import SceneCard from "./SceneCard.jsx";

export default function StoryboardView({
  scenes,
  onSceneUpdated,
  selectedScenes,
  onToggleScene,
}) {
  if (!scenes || scenes.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-700">🎬 Storyboard</h2>
        <span className="text-sm text-gray-400">
          {scenes.length} scene{scenes.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenes.map((scene) => (
          <SceneCard
            key={scene.scene_id}
            scene={scene}
            onUpdated={(updatedScene) => onSceneUpdated(updatedScene)}
            isSelected={selectedScenes.includes(scene.scene_id)}
            onToggle={() => onToggleScene(scene.scene_id)}
          />
        ))}
      </div>
    </div>
  );
}
