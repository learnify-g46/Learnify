import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"

const configure = () => {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key:process.env.CLOUDINARY_API_KEY ,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
}

const uploadOnCloudinary = async(filePath)=>{
    configure()
    try {
       if(!filePath){
        return null
       }
       const uploadResult = await cloudinary.uploader.upload(filePath,{resource_type:'auto'})
       fs.unlinkSync(filePath)
       return uploadResult.secure_url
    } catch (error) {
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath)
        console.log(error);

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
        const parsed = parseCloudinaryUrl(url)
        if (!parsed) return false
        configure()
        await cloudinary.uploader.destroy(parsed.publicId, { resource_type: parsed.resourceType, invalidate: true })
        return true
    } catch (error) {
        console.log("Cloudinary delete failed (non-blocking):", error?.message || error)
        return false
    }
}

export default uploadOnCloudinary
