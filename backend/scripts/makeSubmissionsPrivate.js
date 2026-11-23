// Moves students' EXISTING submitted PDFs (assignment submissions) to private delivery.
//
//   node scripts/makeSubmissionsPrivate.js          -> dry run: only lists what would change
//   node scripts/makeSubmissionsPrivate.js --apply  -> backs up the submissions to backend/backups/, then does it
//
// Safe to run again (files that are already private are skipped). Each file is saved to the database right
// after Cloudinary moved it, so an error never leaves a broken link. Try it on ONE submission first.
import "dotenv/config"
import mongoose from "mongoose"
import AssignmentSubmission from "../models/assignmentSubmissionModel.js"
import { configureCloudinary, writeBackup, moveToPrivate } from "./_shared.js"

const apply = process.argv.includes("--apply")
configureCloudinary()
await mongoose.connect(process.env.MONGODB_URL)

const subs = await AssignmentSubmission.find({ fileUrl: { $exists: true, $ne: "" } })
console.log(`${subs.length} submission(s) have a file.`)
if (apply) console.log("Backup written to:", writeBackup("assignment-submissions", subs.map(s => s.toObject())))

let moved = 0, failed = 0
for (const sub of subs) {
    try {
        const marker = await moveToPrivate(sub.fileUrl, apply)
        if (!marker) continue
        if (apply) { sub.fileUrl = marker; await sub.save() }
        moved++
        console.log(`${apply ? "moved" : "would move"}: submission ${sub._id} (${sub.fileName || "file"})`)
    } catch (error) {
        failed++
        console.log(`FAILED submission ${sub._id}:`, error?.message || error?.error?.message || error)
    }
}
console.log(`\n${apply ? "Done" : "Dry run"}: ${moved} file(s) ${apply ? "made private" : "would be made private"}, ${failed} failed.`)
if (!apply) console.log("Run again with --apply to make the change.")
await mongoose.disconnect()
