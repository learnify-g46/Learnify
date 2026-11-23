import { Readable } from "stream"
import Course from "../models/courseModel.js"
import Lecture from "../models/lectureModel.js"
import User from "../models/userModel.js"
import AssignmentSubmission from "../models/assignmentSubmissionModel.js"
import { parsePrivateMarker, privateDeliveryUrl } from "../configs/cloudinary.js"
import { validId } from "../middlewares/permissions.js"

// Serves PRIVATE lecture files (see configs/cloudinary.js). Every request is checked against the
// course: teacher, admin and enrolled students get the file; everyone else gets 403. The file is
// streamed through this server (with Range support so seeking in videos works) - the Cloudinary
// address is never sent to the browser.

const EXT_TYPES = { pdf: "application/pdf", doc: "application/msword", ppt: "application/vnd.ms-powerpoint", txt: "text/plain",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" }

const safeName = (name = "download") => String(name).replace(/[\r\n"\\/]/g, "_").slice(0, 120) || "download"

// who may fetch this lecture's files; previewOnly = the free-preview video may be fetched by anyone
export const canAccess = async (lecture, userId, { video }) => {
    const course = await Course.findOne({ lectures: lecture._id }).select("creator enrolledStudents isPublished")
    if (!course) return false
    if (video && lecture.isPreviewFree && course.isPublished) return true
    if (!userId) return false
    if (course.creator?.toString() === String(userId)) return true
    if ((course.enrolledStudents || []).some(id => id.toString() === String(userId))) return true
    const user = await User.findById(userId).select("role")
    return user?.role === "admin"
}

export const stream = async (req, res, asset, { filename, forceDownload }) => {
    const controller = new AbortController()
    res.on("close", () => controller.abort())
    try {
        const headers = {}
        if (req.headers.range) headers.Range = req.headers.range
        const upstream = await fetch(privateDeliveryUrl(asset), { headers, signal: controller.signal })
        if (upstream.status === 404) return res.status(404).json({ message: "File not found." })
        if (!upstream.ok && upstream.status !== 206) {
            console.log("media upstream status", upstream.status)
            return res.status(502).json({ message: "The file could not be loaded right now. Please try again." })
        }
        res.status(upstream.status === 206 ? 206 : 200)
        for (const h of ["content-length", "content-range", "accept-ranges", "etag", "last-modified"]) {
            const v = upstream.headers.get(h)
            if (v) res.setHeader(h, v)
        }
        if (!upstream.headers.get("accept-ranges")) res.setHeader("accept-ranges", "bytes")
        const ext = (filename.split(".").pop() || "").toLowerCase()
        res.setHeader("content-type", asset.resourceType === "video" ? (upstream.headers.get("content-type") || "video/mp4") : (EXT_TYPES[ext] || upstream.headers.get("content-type") || "application/octet-stream"))
        res.setHeader("cache-control", "private, no-cache")
        res.setHeader("content-disposition", `${forceDownload ? "attachment" : "inline"}; filename="${safeName(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`)
        if (!upstream.body) return res.end()
        Readable.fromWeb(upstream.body).on("error", () => res.destroy()).pipe(res)
    } catch (error) {
        if (controller.signal.aborted) return // the viewer closed the video / tab
        console.log("media stream error:", error?.message || error)
        if (!res.headersSent) return res.status(502).json({ message: "The file could not be loaded right now. Please try again." })
        res.destroy()
    }
}

const loadLecture = async (req, res) => {
    if (!validId(req.params.lectureId)) { res.status(404).json({ message: "File not found." }); return null }
    const lecture = await Lecture.findById(req.params.lectureId)
    if (!lecture) { res.status(404).json({ message: "File not found." }); return null }
    return lecture
}

export const streamLectureVideo = async (req, res) => {
    try {
        const lecture = await loadLecture(req, res); if (!lecture) return
        if (!(await canAccess(lecture, req.userId, { video: true }))) {
            return res.status(403).json({ message: "Enroll in this course to watch this lecture." })
        }
        const asset = parsePrivateMarker(lecture.videoUrl)
        if (!asset) {
            // an older, public file: nothing private to protect, send the viewer to it
            return lecture.videoUrl ? res.redirect(lecture.videoUrl) : res.status(404).json({ message: "File not found." })
        }
        return stream(req, res, asset, { filename: `${lecture.lectureTitle || "lecture"}.${asset.format || "mp4"}`, forceDownload: req.query.download === "1" })
    } catch (error) {
        console.log("streamLectureVideo error:", error?.message || error)
        return res.status(500).json({ message: "The file could not be loaded right now. Please try again." })
    }
}

export const streamLectureResource = async (req, res) => {
    try {
        const lecture = await loadLecture(req, res); if (!lecture) return
        if (!(await canAccess(lecture, req.userId, { video: false }))) {
            return res.status(403).json({ message: "Enroll in this course to open its study materials." })
        }
        if (!validId(req.params.resourceId)) return res.status(404).json({ message: "File not found." })
        const resource = lecture.resources.find(r => r._id.toString() === req.params.resourceId)
        if (!resource) return res.status(404).json({ message: "File not found." })
        const asset = parsePrivateMarker(resource.url)
        if (!asset) return resource.url ? res.redirect(resource.url) : res.status(404).json({ message: "File not found." })
        return stream(req, res, asset, { filename: resource.name || "study-material", forceDownload: req.query.download === "1" })
    } catch (error) {
        console.log("streamLectureResource error:", error?.message || error)
        return res.status(500).json({ message: "The file could not be loaded right now. Please try again." })
    }
}

// A student's submitted PDF: only that student, the course's teacher and admins may open it.
export const streamSubmissionFile = async (req, res) => {
    try {
        if (!validId(req.params.submissionId)) return res.status(404).json({ message: "File not found." })
        const sub = await AssignmentSubmission.findById(req.params.submissionId)
        if (!sub || !sub.fileUrl) return res.status(404).json({ message: "File not found." })
        if (!req.userId) return res.status(401).json({ message: "Please log in to continue." })
        let allowed = sub.student?.toString() === String(req.userId)
        if (!allowed) {
            const course = await Course.findById(sub.course).select("creator")
            allowed = course?.creator?.toString() === String(req.userId)
        }
        if (!allowed) allowed = (await User.findById(req.userId).select("role"))?.role === "admin"
        if (!allowed) return res.status(403).json({ message: "You don't have access to this file." })
        const asset = parsePrivateMarker(sub.fileUrl)
        if (!asset) return res.redirect(sub.fileUrl) // an older public file: nothing private to protect
        return stream(req, res, asset, { filename: sub.fileName || "submission.pdf", forceDownload: req.query.download === "1" })
    } catch (error) {
        console.log("streamSubmissionFile error:", error?.message || error)
        return res.status(500).json({ message: "The file could not be loaded right now. Please try again." })
    }
}
