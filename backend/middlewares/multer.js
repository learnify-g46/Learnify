import multer from "multer"
import crypto from "crypto"
import fs from "fs"
import path from "path"

// Uploads are written to ./public only as a short-lived temp file before going to Cloudinary.
// Hardening: random file names (no overwrite / no user-chosen names), a type whitelist per field,
// size limits, a "magic bytes" check that the content really is what it claims to be, and cleanup
// of the temp file whatever happens. Permission checks run BEFORE these (see permissions.js).

const MB = 1024 * 1024
const DIR = "./public"
fs.mkdirSync(DIR, { recursive: true })

// mimetype -> [extension, signature check]
const startsWith = (...bytes) => (buf) => bytes.every((b, i) => buf[i] === b)
const ascii = (s, at = 0) => (buf) => buf.subarray(at, at + s.length).toString("latin1") === s
const TYPES = {
    "image/jpeg": [".jpg", startsWith(0xff, 0xd8, 0xff)],
    "image/png": [".png", startsWith(0x89, 0x50, 0x4e, 0x47)],
    "image/gif": [".gif", ascii("GIF8")],
    "image/webp": [".webp", (b) => ascii("RIFF")(b) && ascii("WEBP", 8)(b)],
    "application/pdf": [".pdf", ascii("%PDF")],
    "video/mp4": [".mp4", ascii("ftyp", 4)],
    "video/quicktime": [".mov", ascii("ftyp", 4)],
    "video/webm": [".webm", startsWith(0x1a, 0x45, 0xdf, 0xa3)],
    "video/x-matroska": [".mkv", startsWith(0x1a, 0x45, 0xdf, 0xa3)],
    "application/msword": [".doc", startsWith(0xd0, 0xcf, 0x11, 0xe0)],
    "application/vnd.ms-powerpoint": [".ppt", startsWith(0xd0, 0xcf, 0x11, 0xe0)],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx", startsWith(0x50, 0x4b, 0x03, 0x04)],
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx", startsWith(0x50, 0x4b, 0x03, 0x04)],
    "text/plain": [".txt", (b) => !b.includes(0)]
}
const IMAGES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const VIDEOS = ["video/mp4", "video/quicktime", "video/webm", "video/x-matroska"]
const DOCS = ["application/pdf", "application/msword", "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation", "text/plain"]

const badType = (message) => Object.assign(new Error(message), { code: "INVALID_FILE_TYPE" })

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, DIR),
    filename: (req, file, cb) => {
        const ext = TYPES[file.mimetype]?.[0] || ""
        cb(null, crypto.randomBytes(16).toString("hex") + ext)
    }
})

// allowed: { fieldName: [mimetypes] }
const make = (allowed, fileSize, maxFiles) => multer({
    storage,
    limits: { fileSize, files: maxFiles, fields: 30, parts: 40 },
    fileFilter: (req, file, cb) => {
        const ok = allowed[file.fieldname]
        if (!ok) return cb(badType("Unexpected file field."))
        if (!ok.includes(file.mimetype)) return cb(badType("This file type is not allowed."))
        cb(null, true)
    }
})

export const uploadImage = make({ thumbnail: IMAGES, photoUrl: IMAGES }, 5 * MB, 1)
export const uploadLecture = make({ videoUrl: VIDEOS, resources: [...DOCS, ...IMAGES] }, 500 * MB, 6)
export const uploadSubmission = make({ file: ["application/pdf", "image/jpeg", "image/png", "image/webp"] }, 25 * MB, 1)

const filesOf = (req) => {
    const out = []
    if (req.file) out.push(req.file)
    if (Array.isArray(req.files)) out.push(...req.files)
    else if (req.files) Object.values(req.files).forEach(list => out.push(...list))
    return out
}
const removeFile = (f) => { try { if (f?.path && fs.existsSync(f.path)) fs.unlinkSync(f.path) } catch { /* already gone */ } }

// after multer: the bytes must really be the type the browser claimed, and notes/resources stay small
const RESOURCE_MAX = 25 * MB
export const verifyUploads = (req, res, next) => {
    for (const f of filesOf(req)) {
        const check = TYPES[f.mimetype]?.[1]
        let ok = false
        try {
            const fd = fs.openSync(f.path, "r")
            const buf = Buffer.alloc(512)
            const n = fs.readSync(fd, buf, 0, 512, 0)
            fs.closeSync(fd)
            ok = !!check && n > 0 && check(buf.subarray(0, n))
        } catch { ok = false }
        if (!ok) {
            filesOf(req).forEach(removeFile)
            return res.status(400).json({ message: "This file doesn't look like a valid " + path.extname(f.originalname || "").replace(".", "").toUpperCase() + " file. Please upload the original file." })
        }
        if (f.fieldname === "resources" && f.size > RESOURCE_MAX) {
            filesOf(req).forEach(removeFile)
            return res.status(400).json({ message: "Each study material must be 25 MB or smaller." })
        }
    }
    next()
}

// whatever happens next (success, validation error, crash) the temp files do not stay on the server
export const cleanupUploads = (req, res, next) => {
    res.on("close", () => filesOf(req).forEach(removeFile))
    next()
}

// turns upload problems into clear 400 / 413 answers (mounted after the routes in index.js)
export const uploadErrorHandler = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ message: "That file is too large. Please upload a smaller file." })
        return res.status(400).json({ message: "The upload could not be processed. Please check the file and try again." })
    }
    if (err?.code === "INVALID_FILE_TYPE") return res.status(400).json({ message: err.message })
    return next(err)
}

// last resort: never show internals or stack traces to the browser
export const fallbackErrorHandler = (err, req, res, next) => {
    console.log("Unhandled error:", err?.message || err)
    if (res.headersSent) return next(err)
    if (err?.type === "entity.too.large") return res.status(413).json({ message: "The request is too large." })
    if (err?.type === "entity.parse.failed") return res.status(400).json({ message: "The request could not be read." })
    return res.status(500).json({ message: "Something went wrong on our side. Please try again." })
}

export default uploadImage // kept for old imports
