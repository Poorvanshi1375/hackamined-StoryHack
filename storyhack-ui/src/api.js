const BASE = 'http://localhost:8000'

/**
 * Shared fetch helper — throws a descriptive Error on non-2xx responses.
 * @param {string} url
 * @param {RequestInit} [options]
 * @param {string} [fallbackMessage]
 */
async function apiFetch(url, options = {}, fallbackMessage = 'Request failed') {
    const res = await fetch(url, options)
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail ?? fallbackMessage)
    }
    return res.json()
}

/**
 * Upload a document file and kick off the full initial pipeline.
 * @param {File} file
 * @param {string} levelOfExplanation  'basic' | 'detailed' | 'expert'
 */
export async function startPipeline(file, levelOfExplanation = 'basic') {
    const form = new FormData()
    form.append('file', file)
    form.append('level_of_explanation', levelOfExplanation)
    return apiFetch(`${BASE}/pipeline/start`, { method: 'POST', body: form }, 'Pipeline start failed')
}

/**
 * Fetch the latest storyboard from storyboard_log.json on the server.
 */
export async function getStoryboard() {
    return apiFetch(`${BASE}/pipeline/storyboard`, {}, 'Failed to fetch storyboard')
}

/**
 * Request an edit to a specific scene.
 * @param {number} sceneId
 * @param {string} editRequest  Natural-language edit instruction
 */
export async function editScene(sceneId, editRequest) {
    return apiFetch(
        `${BASE}/scenes/${sceneId}/edit`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ edit_request: editRequest }),
        },
        'Edit failed',
    )
}

/**
 * Approve the storyboard and trigger video rendering.
 * @param {Array<Object>} scenes
 * @param {Object} images
 * @param {Array<number>} selectedScenes
 */
export async function generateVideo(scenes, images, selectedScenes) {
    return apiFetch(
        `${BASE}/pipeline/approve`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scenes, images, selected_scenes: selectedScenes }),
        },
        'Video generation failed',
    )
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
    return apiFetch(`${BASE}/scenes/${sceneId}/versions`, {}, 'Failed to fetch versions')
}

/**
 * Set the active version for a scene.
 * @param {number} sceneId
 * @param {number} version
 */
export async function setSceneVersion(sceneId, version) {
    return apiFetch(
        `${BASE}/scenes/${sceneId}/set-version`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ version }),
        },
        'Failed to set version',
    )
}

/**
 * Fetch supported TTS voices.
 * @returns {{ voices: string[] }}
 */
export async function getVoices() {
    return apiFetch(`${BASE}/voices`, {}, 'Failed to fetch voices')
}

/**
 * Set the TTS voice for a scene.
 * @param {number} sceneId
 * @param {string} voice
 */
export async function setSceneVoice(sceneId, voice) {
    return apiFetch(
        `${BASE}/scenes/${sceneId}/voice`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ voice }),
        },
        'Failed to set voice',
    )
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
    return apiFetch(`${BASE}/summary/generate`, { method: 'POST', body: form }, 'Summary generation failed')
}

/**
 * Refine the summary using a natural-language instruction.
 * @param {string} summary
 * @param {string} coreFocus
 * @param {string} editRequest
 * @returns {{ summary: string, core_focus: string }}
 */
export async function refineSummary(summary, coreFocus, editRequest) {
    return apiFetch(
        `${BASE}/summary/refine`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ summary, core_focus: coreFocus, edit_request: editRequest }),
        },
        'Summary refinement failed',
    )
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
    return apiFetch(
        `${BASE}/summary/approve`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                document,
                summary,
                core_focus: coreFocus,
                level_of_explanation: levelOfExplanation,
            }),
        },
        'Approve summary failed',
    )
}
