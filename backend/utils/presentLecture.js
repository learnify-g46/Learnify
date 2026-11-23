import { parsePrivateMarker } from "../configs/cloudinary.js"

// Turns a stored lecture into what the browser may see. Private files (cld-private://...) are never
// sent as-is: the browser gets our own /api/media/... address, which checks access on every request.
// Older public Cloudinary links pass through unchanged.
export const mediaBase = (req) => `${req.protocol}://${req.get("host")}`

export const presentLecture = (lecture, base) => {
    if (!lecture) return lecture
    const l = lecture.toObject ? lecture.toObject() : { ...lecture }
    const id = String(l._id)
    if (l.videoUrl && parsePrivateMarker(l.videoUrl)) l.videoUrl = `${base}/api/media/lecture/${id}/video`
    if (Array.isArray(l.resources)) {
        l.resources = l.resources.map(r => {
            // the summary text itself is fetched on demand; the page only needs to know whether one exists
            const { summary, summaryAt, ...rest } = r
            const out = { ...rest, hasSummary: !!summary }
            return parsePrivateMarker(r.url) ? { ...out, url: `${base}/api/media/lecture/${id}/resource/${String(r._id)}` } : out
        })
    }
    return l
}

// course object (plain or document) whose lectures are populated objects
export const presentCourseLectures = (course, base) => {
    const obj = course?.toObject ? course.toObject() : course
    if (obj && Array.isArray(obj.lectures)) {
        obj.lectures = obj.lectures.map(l => (l && typeof l === "object" && l._id && !l._bsontype ? presentLecture(l, base) : l))
    }
    return obj
}
