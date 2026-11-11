import fs from "fs"
import crypto from "crypto"

// ---- File hashing (exact-duplicate detection) ----
export const hashFile = (filePath) => {
    const buffer = fs.readFileSync(filePath)
    return crypto.createHash("sha256").update(buffer).digest("hex")
}

let pdfParseFn = null
const getPdfParse = async () => {
    if (!pdfParseFn) {
        const mod = await import("pdf-parse")
        pdfParseFn = mod.default
    }
    return pdfParseFn
}

let TesseractLib = null
const getTesseract = async () => {
    if (!TesseractLib) {
        const mod = await import("tesseract.js")
        TesseractLib = mod.default
    }
    return TesseractLib
}

/**
 * Extracts text from an uploaded assignment file so it can be AI-evaluated
 * and compared for duplicates.
 *
 * - PDF: reads the embedded text layer via pdf-parse (pure JS, no native
 *   deps). This works for any digitally-typed/exported PDF.
 *   IMPORTANT / honest limitation: a scanned or handwritten PDF has no text
 *   layer, so this will come back near-empty. True OCR on PDF *pages* needs
 *   rasterizing each page to an image first, which needs native deps
 *   (canvas / poppler / ghostscript) that aren't bundled here to keep setup
 *   simple on a plain localhost install. In that case we return
 *   ocrMethod "failed" with empty text rather than fabricating a result —
 *   the teacher reviews the original PDF directly in that case.
 * - Image (jpg/png/webp...): runs real OCR via tesseract.js, which is pure
 *   JS/WASM and needs no native build tools, so this path is fully
 *   functional out of the box. Students uploading a photo of handwritten
 *   work (instead of a scanned PDF) get real OCR text.
 */
export const extractTextFromFile = async (filePath, mimeType) => {
    try {
        if (mimeType === "application/pdf") {
            const parse = await getPdfParse()
            const buffer = fs.readFileSync(filePath)
            // pdf-parse bundles an old pdf.js that sporadically throws "bad XRef entry" on a
            // perfectly valid file (seen on the first parse after startup). A retry succeeds,
            // so try up to 3 times before treating the file as unreadable.
            let data = null
            let lastError = null
            for (let attempt = 0; attempt < 3 && !data; attempt++) {
                try {
                    data = await parse(buffer)
                } catch (err) {
                    lastError = err
                }
            }
            if (!data) throw lastError
            const text = (data.text || "").trim()
            if (text.length >= 30) {
                return { text, ocrMethod: "text-layer" }
            }
            return { text: "", ocrMethod: "failed" }
        }

        if (mimeType && mimeType.startsWith("image/")) {
            const Tesseract = await getTesseract()
            const { data } = await Tesseract.recognize(filePath, "eng")
            const text = (data?.text || "").trim()
            return { text, ocrMethod: text ? "ocr" : "failed" }
        }

        return { text: "", ocrMethod: "not_applicable" }
    } catch (error) {
        console.log("Text/OCR extraction failed (non-blocking):", error)
        return { text: "", ocrMethod: "failed" }
    }
}
