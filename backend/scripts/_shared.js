// Helpers shared by the maintenance scripts (makeMediaPrivate, makeSubmissionsPrivate, cleanOrphans).
import fs from "fs"
import path from "path"
import { v2 as cloudinary } from "cloudinary"
import { parseCloudinaryUrl, parsePrivateMarker, makePrivateMarker } from "../configs/cloudinary.js"

export const configureCloudinary = () =>
    cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET })

// A JSON copy of the documents a script is about to change. --apply refuses to run without it
// (the copy is written to backend/backups/, which is not committed to git).
export const writeBackup = (name, docs) => {
    const dir = path.join(process.cwd(), "backups")
    fs.mkdirSync(dir, { recursive: true })
    const file = path.join(dir, `${name}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`)
    fs.writeFileSync(file, JSON.stringify(docs, null, 2))
    return file
}

const formatOf = (url) => { const m = url.split("?")[0].match(/\.([A-Za-z0-9]+)$/); return m ? m[1].toLowerCase() : undefined }

// Moves one public Cloudinary file to private ("authenticated") delivery.
// -> the new marker to store in the database, or null when there is nothing to do (empty / already private / not Cloudinary)
export const moveToPrivate = async (url, apply) => {
    if (!url || parsePrivateMarker(url)) return null
    const parsed = parseCloudinaryUrl(url)
    if (!parsed) return null
    const format = parsed.resourceType === "raw" ? undefined : formatOf(url)
    if (apply) {
        await cloudinary.uploader.rename(parsed.publicId, parsed.publicId, {
            resource_type: parsed.resourceType, type: "upload", to_type: "authenticated", overwrite: true, invalidate: true
        })
    }
    return makePrivateMarker(parsed.resourceType, parsed.publicId, format)
}
