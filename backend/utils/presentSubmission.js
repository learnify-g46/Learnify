import { parsePrivateMarker } from "../configs/cloudinary.js"

// The address a browser may use for a submitted file. Private files are never shown as stored: they are
// reached through /api/media/submission/<id>/file, which checks who is asking every time.
const fileLink = (sub, base) => {
    if (!sub.fileUrl) return ""
    return parsePrivateMarker(sub.fileUrl) ? `${base}/api/media/submission/${String(sub._id)}/file` : sub.fileUrl
}

// what the course teacher sees
export const teacherSubmissionView = (sub, base) => {
    if (!sub) return sub
    const obj = sub.toObject ? sub.toObject() : { ...sub }
    obj.fileUrl = fileLink(obj, base)
    return obj
}

// what a student sees of their OWN submission: no marks / AI notes before results are released, and nothing
// about other students (duplicate checks name or score against other people's work)
export const studentSubmissionView = (sub, assignment, base) => {
    if (!sub) return sub
    const o = sub.toObject ? sub.toObject() : { ...sub }
    const released = !!(assignment && (assignment.resultsReleased || assignment.resultReleaseMode === "immediate"))
    const out = {
        _id: o._id, assignment: o.assignment, type: o.type, status: o.status,
        submittedAt: o.submittedAt, isLate: o.isLate,
        mcqAnswers: o.mcqAnswers || [],
        typedAnswers: (o.typedAnswers || []).map(a => ({
            questionId: a.questionId, answerText: a.answerText,
            ...(released ? { teacherMarks: a.teacherMarks, teacherFeedback: a.teacherFeedback } : {})
        })),
        fileName: o.fileName || "", fileUrl: fileLink(o, base),
        finalMarks: released ? o.finalMarks : null,
        teacherFeedback: released ? o.teacherFeedback : ""
    }
    if (released) out.mcqScore = o.mcqScore
    return out
}
