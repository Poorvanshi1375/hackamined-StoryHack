const BASE = 'http://localhost:8000'

/**
 * Upload a document file and kick off the full initial pipeline.
 * @param {File} file
 * @param {string} levelOfExplanation  'basic' | 'detailed' | 'expert'
 */
export async function startPipeline(file, levelOfExplanation = 'basic') {
    const form = new FormData()
    form.append('file', file)
    form.append('level_of_explanation', levelOfExplanation)

    const res = await fetch(`${BASE}/pipeline/start`, {
        method: 'POST',
        body: form,
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail ?? 'Pipeline start failed')
    }

    return res.json() // { scenes, images }
}

/**
 * Fetch the latest storyboard from storyboard_log.json on the server.
 */
export async function getStoryboard() {
    const res = await fetch(`${BASE}/pipeline/storyboard`)
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail ?? 'Failed to fetch storyboard')
    }
    return res.json() // { version, label, timestamp, scenes }
}

/**
 * Request an edit to a specific scene.
 * @param {number} sceneId
 * @param {string} editRequest  Natural-language edit instruction
 */
export async function editScene(sceneId, editRequest) {
    const res = await fetch(`${BASE}/scenes/${sceneId}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edit_request: editRequest }),
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail ?? 'Edit failed')
    }

    return res.json() // updated SceneOut
}

/**
 * Approve the storyboard and trigger video rendering.
 * @param {Array<Object>} scenes
 * @param {Object} images
 * @param {Array<number>} selectedScenes
 */
export async function generateVideo(scenes, images, selectedScenes) {
    const res = await fetch(`${BASE}/pipeline/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenes, images, selected_scenes: selectedScenes }),
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail ?? 'Video generation failed')
    }
    return res.json() // { video_path }
}

/** Direct URL for the rendered video stream / download. */
export const VIDEO_URL = `${BASE}/video`

/** Helper to build an image URL from its relative path returned by the API. */
export function imageUrl(path) {
    if (!path || path === 'N/A') return null
    // path is like "images/scene_1_v1.png" — serve through FastAPI static mount
    return `${BASE}/${path}`
}

/**
 * Get all available versions for a scene and the currently active one.
 * @param {number} sceneId
 * @returns {{ scene_id, available_versions, active_version }}
 */
export async function getSceneVersions(sceneId) {
    const res = await fetch(`${BASE}/scenes/${sceneId}/versions`)
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail ?? 'Failed to fetch versions')
    }
    return res.json()
}

/**
 * Set the active version for a scene.
 * @param {number} sceneId
 * @param {number} version
 */
export async function setSceneVersion(sceneId, version) {
    const res = await fetch(`${BASE}/scenes/${sceneId}/set-version`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version }),
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail ?? 'Failed to set version')
    }
    return res.json()
}

/**
 * Fetch supported TTS voices.
 * @returns {{ voices: string[] }}
 */
export async function getVoices() {
    const res = await fetch(`${BASE}/voices`)
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail ?? 'Failed to fetch voices')
    }
    return res.json()
}

/**
 * Set the TTS voice for a scene.
 * @param {number} sceneId 
 * @param {string} voice 
 */
export async function setSceneVoice(sceneId, voice) {
    const res = await fetch(`${BASE}/scenes/${sceneId}/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice }),
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail ?? 'Failed to set voice')
    }
    return res.json()
}


// ── Summary stage ─────────────────────────────────────────────────────────────

/**
 * Upload a document file and generate a summary + core focus.
 * @param {File} file
 * @param {string} levelOfExplanation  'basic' | 'detailed' | 'expert'
 * @returns {{ summary: string, core_focus: string }}
 */
export async function generateSummary(file, levelOfExplanation = 'basic') {
    const form = new FormData()
    form.append('file', file)
    form.append('level_of_explanation', levelOfExplanation)

    const res = await fetch(`${BASE}/summary/generate`, {
        method: 'POST',
        body: form,
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail ?? 'Summary generation failed')
    }
    return res.json() // { summary, core_focus }
}

/**
 * Refine the summary using a natural-language instruction.
 * @param {string} summary
 * @param {string} coreFocus
 * @param {string} editRequest
 * @returns {{ summary: string, core_focus: string }}
 */
export async function refineSummary(summary, coreFocus, editRequest) {
    const res = await fetch(`${BASE}/summary/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary, core_focus: coreFocus, edit_request: editRequest }),
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail ?? 'Summary refinement failed')
    }
    return res.json() // { summary, core_focus }
}

/**
 * Approve the summary and trigger scene generation.
 * @param {string} document  Raw document text (stored server-side after /generate)
 * @param {string} summary
 * @param {string} coreFocus
 * @param {string} levelOfExplanation
 * @returns {{ scenes, images }}
 */
export async function approveSummary(document, summary, coreFocus, levelOfExplanation = 'basic') {
    const res = await fetch(`${BASE}/summary/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            document,
            summary,
            core_focus: coreFocus,
            level_of_explanation: levelOfExplanation,
        }),
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail ?? 'Approve summary failed')
    }
    return res.json() // { scenes, images }
}
