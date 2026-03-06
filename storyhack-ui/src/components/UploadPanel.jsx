import { useState } from "react";

const ALLOWED_TYPES = [".pdf", ".ppt", ".pptx", ".doc", ".docx", ".txt"];

export default function UploadPanel({ onGenerate, loading }) {
  const [file, setFile] = useState(null);
  const [explanationStyle, setExplanationStyle] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState("");

  function handleFile(f) {
    if (!f) return;
    const ext = "." + f.name.split(".").pop().toLowerCase();
    if (!ALLOWED_TYPES.includes(ext)) {
      setFileError(
        `Unsupported file type. Allowed: ${ALLOWED_TYPES.join(", ")}`,
      );
      return;
    }
    setFileError("");
    setFile(f);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;
    onGenerate(file, explanationStyle);
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 space-y-5">
      <h2 className="text-lg font-semibold text-gray-700">
        📄 Upload Document
      </h2>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors
          ${dragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-gray-50 hover:border-blue-300 hover:bg-blue-50"}`}
        onClick={() => document.getElementById("file-input").click()}
      >
        <svg
          className="w-10 h-10 text-blue-400 mb-2"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 16.5v-9m0 0-3 3m3-3 3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.338-2.04A5.25 5.25 0 0 1 17.25 19.5H6.75z"
          />
        </svg>
        <p className="text-sm text-gray-500">
          {file ? (
            <span className="font-medium text-blue-600">{file.name}</span>
          ) : (
            <>
              Drag & drop or{" "}
              <span className="text-blue-600 font-medium">browse</span>
            </>
          )}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {ALLOWED_TYPES.join(" · ")}
        </p>
      </div>
      <input
        id="file-input"
        type="file"
        className="hidden"
        accept={ALLOWED_TYPES.join(",")}
        onChange={(e) => handleFile(e.target.files[0])}
      />

      {fileError && <p className="text-sm text-red-500">{fileError}</p>}

      {/* Level selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-600">
          Tone / Style of Explanation
        </label>

        <input
          type="text"
          value={explanationStyle}
          onChange={(e) => setExplanationStyle(e.target.value)}
          placeholder="Example: Explain like a beginner tutorial with simple analogies"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
        />

        <p className="text-xs text-gray-400">
          Describe the tone, level, or style of explanation.
        </p>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!file || loading}
        className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all
          ${
            !file || loading
              ? "bg-blue-200 text-white cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm active:scale-[0.98]"
          }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="w-4 h-4 spin"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" d="M12 3a9 9 0 1 0 9 9" />
            </svg>
            Generating storyboard…
          </span>
        ) : (
          "Generate Storyboard"
        )}
      </button>
    </div>
  );
}
