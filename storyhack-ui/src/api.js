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
 */
export async function generateVideo() {
    const res = await fetch(`${BASE}/pipeline/approve`, { method: 'POST' })
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
    // path is like "images/scene_1.png" — serve through FastAPI static mount
    return `${BASE}/${path}`
}
