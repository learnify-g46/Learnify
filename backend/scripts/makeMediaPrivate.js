// Moves EXISTING public lecture videos / study materials to private ("authenticated") delivery.
//
//   node scripts/makeMediaPrivate.js          -> dry run: only lists what would change
//   node scripts/makeMediaPrivate.js --apply  -> really does it
//
// Safe to run again: files that are already private are skipped. Take a database backup first, and
// try it on ONE test lecture before running on everything. Needs the normal .env (MongoDB + Cloudinary).
// After it has run, set PRIVATE_MEDIA=true so new uploads are private too.
import "dotenv/config"
import mongoose from "mongoose"
import { v2 as cloudinary } from "cloudinary"
import Lecture from "../models/lectureModel.js"
import { writeBackup } from "./_shared.js"
import { parseCloudinaryUrl, parsePrivateMarker, makePrivateMarker } from "../configs/cloudinary.js"

const apply = process.argv.includes("--apply")
cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET })

// the format (extension) matters for delivery of image/video assets, keep it from the old URL
const formatOf = (url) => { const m = url.split("?")[0].match(/\.([A-Za-z0-9]+)$/); return m ? m[1].toLowerCase() : undefined }

const moveOne = async (url) => {
    if (!url || parsePrivateMarker(url)) return null // nothing there / already private
    const parsed = parseCloudinaryUrl(url)
    if (!parsed) return null // not a Cloudinary file we know
    const format = parsed.resourceType === "raw" ? undefined : formatOf(url)
    if (apply) {
        await cloudinary.uploader.rename(parsed.publicId, parsed.publicId, {
            resource_type: parsed.resourceType, type: "upload", to_type: "authenticated", overwrite: true, invalidate: true
        })
    }
    return makePrivateMarker(parsed.resourceType, parsed.publicId, format)
}

await mongoose.connect(process.env.MONGODB_URL)
const lectures = await Lecture.find()
if (apply) console.log("Backup written to:", writeBackup("lectures", lectures.map(l => l.toObject())))
let moved = 0, failed = 0
for (const lecture of lectures) {
    let changed = false
    try {
        const v = await moveOne(lecture.videoUrl)
        if (v) { lecture.videoUrl = v; changed = true; moved++; if (apply) await lecture.save() }
        for (const r of lecture.resources) {
            const m = await moveOne(r.url)
            if (m) { r.url = m; changed = true; moved++; if (apply) await lecture.save() }
        }
        if (changed) console.log(`${apply ? "moved" : "would move"}: lecture "${lecture.lectureTitle}" (${lecture._id})`)
    } catch (error) {
        failed++
        // every file is saved to the database right after Cloudinary moved it, so a failure never leaves a broken link
        console.log(`FAILED lecture ${lecture._id}:`, error?.message || error?.error?.message || error)
    }
}
console.log(`\n${apply ? "Done" : "Dry run"}: ${moved} file(s) ${apply ? "made private" : "would be made private"}, ${failed} failed.`)
if (!apply) console.log("Run again with --apply to make the change.")
await mongoose.disconnect()
