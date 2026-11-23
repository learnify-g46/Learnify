import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"

const configure = () => {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key:process.env.CLOUDINARY_API_KEY ,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
}

// ---------------------------------------------------------------------------
// PRIVATE MEDIA (lecture videos + study materials)
// With PRIVATE_MEDIA=true new lecture files are uploaded to Cloudinary as "authenticated" assets: they
// have no public URL at all. We store only a marker string (cld-private://<type>/<public id>?f=<format>),
// and the browser gets our own /api/media/... address, which checks enrollment on every request and
// streams the file from Cloudinary. The Cloudinary address never leaves the server, so a leaked link
// cannot be shared. Old public URLs keep working until you run scripts/makeMediaPrivate.js.
// ---------------------------------------------------------------------------
export const privateMediaOn = () => process.env.PRIVATE_MEDIA === "true"
// students' submitted PDFs are always private unless this is switched off on purpose (PRIVATE_ASSIGNMENT_FILES=false)
export const privateAssignmentFilesOn = () => process.env.PRIVATE_ASSIGNMENT_FILES !== "false"
const PRIVATE_PREFIX = "cld-private://"

export const makePrivateMarker = (resourceType, publicId, format) =>
    `${PRIVATE_PREFIX}${resourceType}/${publicId}${format ? `?f=${format}` : ""}`

// -> { resourceType, publicId, format } or null when the value is a normal (public) URL
export const parsePrivateMarker = (value = "") => {
    if (typeof value !== "string" || !value.startsWith(PRIVATE_PREFIX)) return null
    const m = value.slice(PRIVATE_PREFIX.length).match(/^(image|video|raw)\/(.+?)(?:\?f=([A-Za-z0-9]+))?$/)
    return m ? { resourceType: m[1], publicId: m[2], format: m[3] || undefined } : null
}

// the (secret, server-side only) Cloudinary delivery address of a private asset
export const privateDeliveryUrl = ({ resourceType, publicId, format }) => {
    // automated tests plug in a fake delivery server here; ignored in every other environment
    if (process.env.NODE_ENV === "test" && globalThis.__CLOUDINARY_DELIVERY_MOCK__) {
        return globalThis.__CLOUDINARY_DELIVERY_MOCK__({ resourceType, publicId, format })
    }
    configure()
    return cloudinary.url(publicId, { resource_type: resourceType, type: "authenticated", sign_url: true, secure: true, ...(format ? { format } : {}) })
}

// priv = true -> stored as a private asset, returns the marker instead of a public URL
const uploadOnCloudinary = async(filePath, { priv = false } = {})=>{
    configure()
    uploadOnCloudinary.lastError = null
    try {
       if(!filePath){
        return null
       }
       const options = { resource_type: 'auto', ...(priv ? { type: "authenticated" } : {}) }
       const uploadResult = (process.env.NODE_ENV === "test" && globalThis.__CLOUDINARY_UPLOAD_MOCK__)
           ? await globalThis.__CLOUDINARY_UPLOAD_MOCK__(filePath, options)
           : await cloudinary.uploader.upload(filePath, options)
       fs.unlinkSync(filePath)
       if (priv) return makePrivateMarker(uploadResult.resource_type, uploadResult.public_id, uploadResult.format)
       return uploadResult.secure_url
    } catch (error) {
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath)
        console.log(error);
        // lets the caller tell the user WHY (wrong key, file too big...) instead of silently saving nothing
        uploadOnCloudinary.lastError = error?.error?.message || error?.message || "unknown problem"
    }
}

// Pulls { resourceType, publicId } out of a Cloudinary delivery URL, e.g.
// https://res.cloudinary.com/<cloud>/video/upload/v123/abc.mp4
// -> { resourceType: "video", publicId: "abc" }
// (raw files keep their extension in the public id; image/video do not)
export const parseCloudinaryUrl = (url = "") => {
    const match = url.match(/\/(image|video|raw)\/upload\/(?:[^/]+\/)*?(?:v\d+\/)?([^?#]+)$/)
    if (!match) return null
    const resourceType = match[1]
    let publicId = decodeURIComponent(match[2])
    if (resourceType !== "raw") publicId = publicId.replace(/\.[^/.]+$/, "")
    return { resourceType, publicId }
}

// Best-effort removal of the stored file from Cloudinary. Never throws — the DB
// record is the source of truth, a failed remote delete must not block the user.
export const deleteFromCloudinary = async (url) => {
    try {
        const priv = parsePrivateMarker(url)
        const parsed = priv || parseCloudinaryUrl(url)
        if (!parsed) return false
        configure()
        const options = { resource_type: parsed.resourceType, invalidate: true, ...(priv ? { type: "authenticated" } : {}) }
        if (process.env.NODE_ENV === "test" && globalThis.__CLOUDINARY_DESTROY_MOCK__) {
            await globalThis.__CLOUDINARY_DESTROY_MOCK__(parsed.publicId, options)
        } else {
            await cloudinary.uploader.destroy(parsed.publicId, options)
        }
        return true
    } catch (error) {
        console.log("Cloudinary delete failed (non-blocking):", error?.message || error)
        return false
    }
}

export default uploadOnCloudinary
