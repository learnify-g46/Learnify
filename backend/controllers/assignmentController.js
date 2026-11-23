import { GoogleGenAI } from "@google/genai"
import Assignment from "../models/assignmentModel.js"
import AssignmentSubmission from "../models/assignmentSubmissionModel.js"
import Course from "../models/courseModel.js"
import uploadOnCloudinary, { privateAssignmentFilesOn } from "../configs/cloudinary.js"
import { teacherSubmissionView, studentSubmissionView } from "../utils/presentSubmission.js"
import { mediaBase } from "../utils/presentLecture.js"
import { validId } from "../middlewares/permissions.js"
import { hashFile, extractTextFromFile } from "../utils/ocr.js"
import { textSimilarityPercent, SIMILARITY_DUPLICATE_THRESHOLD } from "../utils/duplicateDetection.js"
import fs from "fs"

// Same ownership pattern as quizController.js
const ensureCourseOwner = async (courseId, userId) => {
    const course = await Course.findById(courseId)
    if (!course) return { error: "Course not found", status: 404 }
    if (course.creator?.toString() !== userId?.toString()) {
        return { error: "Access denied. Only this course's teacher can manage its assignments.", status: 403 }
    }
    return { course }
}

const ensureEnrolled = async (courseId, userId) => {
    const course = await Course.findById(courseId)
    if (!course) return { error: "Course not found", status: 404 }
    const isEnrolled = course.enrolledStudents?.some(id => id.toString() === userId.toString())
    if (!isEnrolled) return { error: "Enroll in this course to access its assignments", status: 403 }
    return { course }
}

const isPastDue = (assignment) => new Date() > new Date(assignment.dueDate)

// ---------------------------------------------------------------------
// AI generation (draft only, not saved) - mirrors generateQuizWithAI
// ---------------------------------------------------------------------
export const generateAssignmentWithAI = async (req, res) => {
    try {
        const { courseId } = req.params
        const { type, topic, numberOfQuestions = 5, difficulty = "Intermediate" } = req.body

        const ownership = await ensureCourseOwner(courseId, req.userId)
        if (ownership.error) return res.status(ownership.status).json({ message: ownership.error })

        const ai = new GoogleGenAI({})

        if (type === "mcq") {
            const prompt = `You are an assistant that creates multiple choice assignment questions for an LMS platform.
Generate exactly ${numberOfQuestions} MCQ questions on the topic: "${topic}" at ${difficulty} difficulty.
Reply ONLY with valid JSON, no markdown fences, no extra text, in this exact structure:
[
  {
    "questionText": "string",
    "options": ["option1","option2","option3","option4"],
    "correctOptionIndex": 0,
    "explanation": "string",
    "marks": 1
  }
]`
            const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt })
            let raw = response.text.trim().replace(/```json|```/g, "").trim()
            const questions = JSON.parse(raw)
            return res.status(200).json({ questions })
        }

        if (type === "typed") {
            const prompt = `You are an assistant that creates typed-answer / short-answer assignment questions for an LMS platform.
Generate exactly ${numberOfQuestions} questions on the topic: "${topic}" at ${difficulty} difficulty.
Reply ONLY with valid JSON, no markdown fences, no extra text, in this exact structure:
[
  {
    "questionText": "string",
    "markingCriteria": "string describing what a good answer should cover, for the evaluator",
    "maxMarks": 10
  }
]`
            const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt })
            let raw = response.text.trim().replace(/```json|```/g, "").trim()
            const questions = JSON.parse(raw)
            return res.status(200).json({ questions })
        }

        return res.status(400).json({ message: "AI generation is only available for mcq and typed assignment types" })
    } catch (error) {
        return res.status(500).json({ message: `AI assignment generation failed ${error}` })
    }
}

// ---------------------------------------------------------------------
// Teacher: create / edit / delete / publish / list
// ---------------------------------------------------------------------
export const createAssignment = async (req, res) => {
    try {
        const { courseId } = req.params
        const ownership = await ensureCourseOwner(courseId, req.userId)
        if (ownership.error) return res.status(ownership.status).json({ message: ownership.error })

        const {
            title, description, instructions, type,
            mcqQuestions, randomizeQuestions,
            typedQuestions, isCodeAssignment,
            allowedFileTypes, maxFileSizeMB,
            maxMarks, dueDate, allowLateSubmission, lateSubmissionPenaltyPercent,
            resultReleaseMode, status
        } = req.body

        if (!title || !type || !dueDate) {
            return res.status(400).json({ message: "title, type and dueDate are required" })
        }
        if (type === "mcq" && (!mcqQuestions || mcqQuestions.length === 0)) {
            return res.status(400).json({ message: "At least one MCQ question is required" })
        }
        if (type === "typed" && (!typedQuestions || typedQuestions.length === 0)) {
            return res.status(400).json({ message: "At least one question is required" })
        }

        const assignment = await Assignment.create({
            title, description, instructions, type,
            course: courseId, createdBy: req.userId,
            mcqQuestions: type === "mcq" ? mcqQuestions : [],
            randomizeQuestions: !!randomizeQuestions,
            typedQuestions: type === "typed" ? typedQuestions : [],
            isCodeAssignment: !!isCodeAssignment,
            allowedFileTypes: type === "pdf" ? (allowedFileTypes || ["pdf"]) : [],
            maxFileSizeMB: maxFileSizeMB || 10,
            maxMarks: maxMarks || (type === "mcq" ? (mcqQuestions || []).reduce((s, q) => s + (q.marks || 1), 0) : 10),
            dueDate,
            allowLateSubmission: !!allowLateSubmission,
            lateSubmissionPenaltyPercent: lateSubmissionPenaltyPercent || 0,
            resultReleaseMode: resultReleaseMode || "manual",
            status: status || "draft"
        })

        return res.status(201).json(assignment)
    } catch (error) {
        return res.status(500).json({ message: `Failed to create assignment ${error}` })
    }
}

export const editAssignment = async (req, res) => {
    try {
        const { assignmentId } = req.params
        const assignment = await Assignment.findById(assignmentId)
        if (!assignment) return res.status(404).json({ message: "Assignment not found" })

        const ownership = await ensureCourseOwner(assignment.course, req.userId)
        if (ownership.error) return res.status(ownership.status).json({ message: ownership.error })

        const editable = [
            "title", "description", "instructions",
            "mcqQuestions", "randomizeQuestions",
            "typedQuestions", "isCodeAssignment",
            "allowedFileTypes", "maxFileSizeMB",
            "maxMarks", "dueDate", "allowLateSubmission", "lateSubmissionPenaltyPercent",
            "resultReleaseMode", "resultsReleased", "status"
        ]
        editable.forEach(field => {
            if (req.body[field] !== undefined) assignment[field] = req.body[field]
        })
        await assignment.save()

        return res.status(200).json(assignment)
    } catch (error) {
        return res.status(500).json({ message: `Failed to edit assignment ${error}` })
    }
}

export const deleteAssignment = async (req, res) => {
    try {
        const { assignmentId } = req.params
        const assignment = await Assignment.findById(assignmentId)
        if (!assignment) return res.status(404).json({ message: "Assignment not found" })

        const ownership = await ensureCourseOwner(assignment.course, req.userId)
        if (ownership.error) return res.status(ownership.status).json({ message: ownership.error })

        await Assignment.findByIdAndDelete(assignmentId)
        await AssignmentSubmission.deleteMany({ assignment: assignmentId })

        return res.status(200).json({ message: "Assignment deleted successfully" })
    } catch (error) {
        return res.status(500).json({ message: `Failed to delete assignment ${error}` })
    }
}

export const getAssignmentsForTeacher = async (req, res) => {
    try {
        const { courseId } = req.params
        const ownership = await ensureCourseOwner(courseId, req.userId)
        if (ownership.error) return res.status(ownership.status).json({ message: ownership.error })

        const assignments = await Assignment.find({ course: courseId }).sort({ createdAt: -1 })
        return res.status(200).json(assignments)
    } catch (error) {
        return res.status(500).json({ message: `Failed to fetch assignments ${error}` })
    }
}

export const getAssignmentForTeacher = async (req, res) => {
    try {
        const { assignmentId } = req.params
        const assignment = await Assignment.findById(assignmentId)
        if (!assignment) return res.status(404).json({ message: "Assignment not found" })

        const ownership = await ensureCourseOwner(assignment.course, req.userId)
        if (ownership.error) return res.status(ownership.status).json({ message: ownership.error })

        return res.status(200).json(assignment)
    } catch (error) {
        return res.status(500).json({ message: `Failed to fetch assignment ${error}` })
    }
}

// ---------------------------------------------------------------------
// Student: list / view / submit
// ---------------------------------------------------------------------
export const getAssignmentsForStudent = async (req, res) => {
    try {
        const { courseId } = req.params
        const ownership = await ensureEnrolled(courseId, req.userId)
        if (ownership.error) return res.status(ownership.status).json({ message: ownership.error })

        const assignments = await Assignment.find({ course: courseId, status: "published" })
            .sort({ dueDate: 1 })

        const submissions = await AssignmentSubmission.find({
            course: courseId, student: req.userId
        })
        const submissionByAssignment = {}
        submissions.forEach(s => { submissionByAssignment[s.assignment.toString()] = s })

        const result = assignments.map(a => {
            const sub = submissionByAssignment[a._id.toString()]
            let displayStatus = "not_started"
            if (sub) displayStatus = sub.status
            else if (isPastDue(a)) displayStatus = "overdue"

            const obj = a.toObject()
            // Hide correct answers from students before results are released
            if (obj.mcqQuestions) {
                obj.mcqQuestions = obj.mcqQuestions.map(q => {
                    const { correctOptionIndex, explanation, ...rest } = q
                    return rest
                })
            }
            return {
                ...obj,
                myStatus: displayStatus,
                mySubmission: sub ? {
                    status: sub.status, submittedAt: sub.submittedAt, isLate: sub.isLate,
                    finalMarks: a.resultsReleased || a.resultReleaseMode === "immediate" ? sub.finalMarks : null,
                    teacherFeedback: a.resultsReleased || a.resultReleaseMode === "immediate" ? sub.teacherFeedback : ""
                } : null
            }
        })

        return res.status(200).json(result)
    } catch (error) {
        return res.status(500).json({ message: `Failed to fetch assignments ${error}` })
    }
}

export const getAssignmentForStudent = async (req, res) => {
    try {
        const { assignmentId } = req.params
        const assignment = await Assignment.findById(assignmentId)
        if (!assignment || assignment.status !== "published") {
            return res.status(404).json({ message: "Assignment not found" })
        }
        const ownership = await ensureEnrolled(assignment.course, req.userId)
        if (ownership.error) return res.status(ownership.status).json({ message: ownership.error })

        const obj = assignment.toObject()
        if (obj.mcqQuestions) {
            obj.mcqQuestions = obj.mcqQuestions.map(q => {
                const { correctOptionIndex, explanation, ...rest } = q
                return rest
            })
        }

        const existingSubmission = await AssignmentSubmission.findOne({ assignment: assignmentId, student: req.userId })

        return res.status(200).json({ assignment: obj, submission: studentSubmissionView(existingSubmission, assignment, mediaBase(req)) })
    } catch (error) {
        return res.status(500).json({ message: `Failed to fetch assignment ${error}` })
    }
}

// MCQ submit -> auto-graded immediately
export const submitMcqAssignment = async (req, res) => {
    try {
        const { assignmentId } = req.params
        const { answers } = req.body // [{ questionId, selectedOptionIndex }]

        const assignment = await Assignment.findById(assignmentId)
        if (!assignment || assignment.type !== "mcq") return res.status(404).json({ message: "MCQ assignment not found" })

        const ownership = await ensureEnrolled(assignment.course, req.userId)
        if (ownership.error) return res.status(ownership.status).json({ message: ownership.error })

        const late = isPastDue(assignment)
        if (late && !assignment.allowLateSubmission) {
            return res.status(400).json({ message: "The due date has passed and late submissions are not allowed for this assignment" })
        }

        let score = 0
        assignment.mcqQuestions.forEach(q => {
            const given = answers?.find(a => a.questionId === q._id.toString())
            if (given && given.selectedOptionIndex === q.correctOptionIndex) {
                score += q.marks || 1
            }
        })

        let finalMarks = score
        if (late && assignment.lateSubmissionPenaltyPercent > 0) {
            finalMarks = Math.round(score * (1 - assignment.lateSubmissionPenaltyPercent / 100))
        }

        const submission = await AssignmentSubmission.findOneAndUpdate(
            { assignment: assignmentId, student: req.userId },
            {
                assignment: assignmentId, course: assignment.course, student: req.userId, type: "mcq",
                status: "evaluated",
                mcqAnswers: answers || [],
                mcqScore: score,
                finalMarks,
                isLate: late,
                submittedAt: new Date(),
                evaluatedAt: new Date()
            },
            { upsert: true, new: true }
        )

        return res.status(200).json({ message: "Assignment submitted successfully", submission: studentSubmissionView(submission, assignment, mediaBase(req)) })
    } catch (error) {
        return res.status(500).json({ message: `Failed to submit assignment ${error}` })
    }
}

// Typed/Code submit -> AI-suggested marks, teacher must review before it counts as final
export const submitTypedAssignment = async (req, res) => {
    try {
        const { assignmentId } = req.params
        const { answers, pasteAttempts } = req.body // [{ questionId, answerText }]

        const assignment = await Assignment.findById(assignmentId)
        if (!assignment || assignment.type !== "typed") return res.status(404).json({ message: "Assignment not found" })

        const ownership = await ensureEnrolled(assignment.course, req.userId)
        if (ownership.error) return res.status(ownership.status).json({ message: ownership.error })

        const late = isPastDue(assignment)
        if (late && !assignment.allowLateSubmission) {
            return res.status(400).json({ message: "The due date has passed and late submissions are not allowed for this assignment" })
        }

        const typedAnswers = (answers || []).map(a => ({
            questionId: a.questionId, answerText: a.answerText || "",
            aiSuggestedMarks: null, aiFeedback: "", teacherMarks: null, teacherFeedback: ""
        }))

        const submission = await AssignmentSubmission.findOneAndUpdate(
            { assignment: assignmentId, student: req.userId },
            {
                assignment: assignmentId, course: assignment.course, student: req.userId, type: "typed",
                status: "submitted",
                typedAnswers,
                pasteAttempts: pasteAttempts || 0,
                isLate: late,
                submittedAt: new Date()
            },
            { upsert: true, new: true }
        )

        // AI-suggested grading - best effort, never blocks the submission itself
        try {
            await aiGradeTypedSubmission(assignment, submission)
        } catch (aiError) {
            console.log("AI grading failed for typed submission (non-blocking):", aiError)
        }

        const refreshed = await AssignmentSubmission.findById(submission._id)
        return res.status(200).json({ message: "Assignment submitted successfully", submission: studentSubmissionView(refreshed, assignment, mediaBase(req)) })
    } catch (error) {
        return res.status(500).json({ message: `Failed to submit assignment ${error}` })
    }
}

const aiGradeTypedSubmission = async (assignment, submission) => {
    const ai = new GoogleGenAI({})
    let totalAi = 0
    const updatedAnswers = []

    for (const ans of submission.typedAnswers) {
        const question = assignment.typedQuestions.find(q => q._id.toString() === ans.questionId.toString())
        if (!question) { updatedAnswers.push(ans); continue }

        try {
            const prompt = `You are grading a student's ${assignment.isCodeAssignment ? "code" : "written"} answer for an LMS assignment.
Question: ${question.questionText}
Marking criteria: ${question.markingCriteria || "Use your best judgement on correctness, completeness and clarity."}
Maximum marks: ${question.maxMarks}
Student's answer:
"""
${ans.answerText || "(empty)"}
"""
Reply ONLY with valid JSON, no markdown fences, no extra text, in this exact structure:
{ "marks": number (0 to ${question.maxMarks}), "feedback": "short constructive feedback string" }
This is a SUGGESTED score only - a teacher will review and can change it.`

            const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt })
            let raw = response.text.trim().replace(/```json|```/g, "").trim()
            const result = JSON.parse(raw)

            ans.aiSuggestedMarks = Math.max(0, Math.min(question.maxMarks, Number(result.marks) || 0))
            ans.aiFeedback = result.feedback || ""
            totalAi += ans.aiSuggestedMarks
        } catch (err) {
            ans.aiFeedback = ""
            ans.aiSuggestedMarks = null
        }
        updatedAnswers.push(ans)
    }

    const anyFailed = updatedAnswers.some(a => a.aiSuggestedMarks === null)
    submission.typedAnswers = updatedAnswers
    submission.aiSuggestedMarks = anyFailed ? null : totalAi
    submission.aiEvaluationFailed = anyFailed
    submission.status = "under_review"
    await submission.save()
}

// PDF/Handwritten submit -> upload, hash, extract text, duplicate check, AI evaluation draft
export const submitPdfAssignment = async (req, res) => {
    try {
        const { assignmentId } = req.params
        const assignment = await Assignment.findById(assignmentId)
        if (!assignment || assignment.type !== "pdf") return res.status(404).json({ message: "Assignment not found" })

        const ownership = await ensureEnrolled(assignment.course, req.userId)
        if (ownership.error) return res.status(ownership.status).json({ message: ownership.error })

        const late = isPastDue(assignment)
        if (late && !assignment.allowLateSubmission) {
            if (req.file) fs.existsSync(req.file.path) && fs.unlinkSync(req.file.path)
            return res.status(400).json({ message: "The due date has passed and late submissions are not allowed for this assignment" })
        }

        if (!req.file) return res.status(400).json({ message: "A file upload is required" })

        const maxBytes = (assignment.maxFileSizeMB || 10) * 1024 * 1024
        if (req.file.size > maxBytes) {
            fs.existsSync(req.file.path) && fs.unlinkSync(req.file.path)
            return res.status(400).json({ message: `File exceeds the ${assignment.maxFileSizeMB}MB limit for this assignment` })
        }

        const sha256Hash = hashFile(req.file.path)
        const { text: ocrText, ocrMethod } = await extractTextFromFile(req.file.path, req.file.mimetype)
        const fileUrl = await uploadOnCloudinary(req.file.path, { priv: privateAssignmentFilesOn() }) // also deletes the local temp file
        if (!fileUrl) return res.status(502).json({ message: "Your file could not be stored right now. Nothing was submitted - please try again." })

        // ---- Duplicate detection (advisory only, never blocks the submission) ----
        let duplicateStatus = "none"
        let duplicateOfSubmission = null
        let similarityScore = null

        const otherSubmissions = await AssignmentSubmission.find({
            assignment: assignmentId, student: { $ne: req.userId }, type: "pdf"
        })

        const exactMatch = otherSubmissions.find(s => s.sha256Hash && s.sha256Hash === sha256Hash)
        if (exactMatch) {
            duplicateStatus = "exact_duplicate_candidate"
            duplicateOfSubmission = exactMatch._id
            similarityScore = 100
        } else if (ocrText && ocrText.length >= 30) {
            for (const other of otherSubmissions) {
                if (!other.ocrText || other.ocrText.length < 30) continue
                const sim = textSimilarityPercent(ocrText, other.ocrText)
                if (sim >= SIMILARITY_DUPLICATE_THRESHOLD) {
                    duplicateStatus = "potential_duplicate"
                    duplicateOfSubmission = other._id
                    similarityScore = sim
                    break
                }
            }
        }
        if (ocrMethod === "failed") {
            // No usable text at all (e.g. scanned handwritten PDF) - can't compare
            // automatically, so flag for a manual look rather than silently skipping it.
            duplicateStatus = duplicateStatus === "none" ? "needs_review" : duplicateStatus
        }

        const submission = await AssignmentSubmission.findOneAndUpdate(
            { assignment: assignmentId, student: req.userId },
            {
                assignment: assignmentId, course: assignment.course, student: req.userId, type: "pdf",
                status: "submitted",
                fileUrl, fileName: req.file.originalname,
                sha256Hash, ocrText, ocrMethod,
                duplicateStatus, duplicateOfSubmission, similarityScore,
                isLate: late,
                submittedAt: new Date()
            },
            { upsert: true, new: true }
        )

        // AI evaluation draft from OCR'd/extracted text - best effort only
        if (ocrText && ocrText.length >= 30) {
            try {
                await aiGradePdfSubmission(assignment, submission)
            } catch (aiError) {
                console.log("AI grading failed for PDF submission (non-blocking):", aiError)
            }
        }

        const refreshed = await AssignmentSubmission.findById(submission._id)
        return res.status(200).json({ message: "Assignment submitted successfully", submission: studentSubmissionView(refreshed, assignment, mediaBase(req)) })
    } catch (error) {
        return res.status(500).json({ message: `Failed to submit assignment ${error}` })
    }
}

const aiGradePdfSubmission = async (assignment, submission) => {
    const ai = new GoogleGenAI({})
    const prompt = `You are grading a student's submitted work for an LMS assignment, extracted from an uploaded file via text extraction/OCR (so it may contain minor extraction errors - judge the underlying content, not formatting glitches).
Assignment title: ${assignment.title}
Instructions: ${assignment.instructions || "(none given)"}
Maximum marks: ${assignment.maxMarks}
Extracted submission text:
"""
${submission.ocrText}
"""
Reply ONLY with valid JSON, no markdown fences, no extra text, in this exact structure:
{ "marks": number (0 to ${assignment.maxMarks}), "feedback": "short constructive feedback string" }
This is a SUGGESTED score only - a teacher will review the original file and can change it.`

    try {
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt })
        let raw = response.text.trim().replace(/```json|```/g, "").trim()
        const result = JSON.parse(raw)
        submission.aiSuggestedMarks = Math.max(0, Math.min(assignment.maxMarks, Number(result.marks) || 0))
        submission.aiFeedback = result.feedback || ""
        submission.aiEvaluationFailed = false
    } catch (err) {
        submission.aiSuggestedMarks = null
        submission.aiEvaluationFailed = true
    }
    submission.status = "under_review"
    await submission.save()
}

// ---------------------------------------------------------------------
// Teacher: review submissions / finalize marks / release results
// ---------------------------------------------------------------------
export const getSubmissionsForAssignment = async (req, res) => {
    try {
        const { assignmentId } = req.params
        const assignment = await Assignment.findById(assignmentId)
        if (!assignment) return res.status(404).json({ message: "Assignment not found" })

        const ownership = await ensureCourseOwner(assignment.course, req.userId)
        if (ownership.error) return res.status(ownership.status).json({ message: ownership.error })

        const submissions = await AssignmentSubmission.find({ assignment: assignmentId })
            .populate("student", "name email photoUrl")
            .populate("duplicateOfSubmission", "student submittedAt")
            .sort({ submittedAt: -1 })

        return res.status(200).json(submissions.filter(s => s.student).map(s => teacherSubmissionView(s, mediaBase(req)))) // skip work of deleted students
    } catch (error) {
        return res.status(500).json({ message: `Failed to fetch submissions ${error}` })
    }
}

// a mark: a real number from 0 up to max (numeric text such as "7.5" is fine); anything else -> null
const parseMark = (value, max) => {
    const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value
    if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > max) return null
    return Math.round(n * 100) / 100
}

export const reviewSubmission = async (req, res) => {
    try {
        const { submissionId } = req.params
        const { finalMarks, teacherFeedback, typedAnswerReviews } = req.body || {}
        // typedAnswerReviews: [{ questionId, teacherMarks, teacherFeedback }]

        if (!validId(submissionId)) return res.status(400).json({ message: "Invalid submission." })
        const submission = await AssignmentSubmission.findById(submissionId)
        if (!submission) return res.status(404).json({ message: "Submission not found" })

        const assignment = await Assignment.findById(submission.assignment)
        if (!assignment) return res.status(404).json({ message: "Assignment not found" })
        const ownership = await ensureCourseOwner(assignment.course, req.userId)
        if (ownership.error) return res.status(ownership.status).json({ message: ownership.error })

        // ---- check everything first; nothing is changed unless all of it is valid ----
        const maxMarks = assignment.maxMarks
        let newFinal
        if (finalMarks !== undefined) {
            newFinal = parseMark(finalMarks, maxMarks)
            if (newFinal === null) return res.status(400).json({ message: `Final marks must be a number from 0 to ${maxMarks}.` })
        }
        let newFeedback
        if (teacherFeedback !== undefined) {
            if (typeof teacherFeedback !== "string" || teacherFeedback.length > 5000) {
                return res.status(400).json({ message: "Feedback must be text of up to 5000 characters." })
            }
            newFeedback = teacherFeedback.trim()
        }
        const answerUpdates = []
        if (typedAnswerReviews !== undefined) {
            if (!Array.isArray(typedAnswerReviews) || typedAnswerReviews.length > 200) {
                return res.status(400).json({ message: "The question reviews could not be read." })
            }
            for (const review of typedAnswerReviews) {
                if (!review || typeof review !== "object" || typeof review.questionId !== "string") {
                    return res.status(400).json({ message: "The question reviews could not be read." })
                }
                const ans = submission.typedAnswers.find(a => a.questionId.toString() === review.questionId)
                if (!ans) return res.status(400).json({ message: "A reviewed question does not belong to this submission." })
                const question = (assignment.typedQuestions || []).find(q => q._id.toString() === review.questionId)
                const qMax = question?.maxMarks ?? maxMarks
                const marks = parseMark(review.teacherMarks, qMax)
                if (marks === null) return res.status(400).json({ message: `Marks for a question must be a number from 0 to ${qMax}.` })
                let fb = ""
                if (review.teacherFeedback !== undefined && review.teacherFeedback !== null) {
                    if (typeof review.teacherFeedback !== "string" || review.teacherFeedback.length > 2000) {
                        return res.status(400).json({ message: "Feedback for a question must be text of up to 2000 characters." })
                    }
                    fb = review.teacherFeedback.trim()
                }
                answerUpdates.push({ ans, marks, fb })
            }
        }

        for (const u of answerUpdates) { u.ans.teacherMarks = u.marks; u.ans.teacherFeedback = u.fb }
        if (newFinal !== undefined) submission.finalMarks = newFinal
        else if (submission.type === "typed" && answerUpdates.length) {
            const total = submission.typedAnswers.reduce((s, a) => s + (a.teacherMarks ?? a.aiSuggestedMarks ?? 0), 0)
            submission.finalMarks = Math.min(maxMarks, Math.round(total * 100) / 100)
        }
        if (newFeedback !== undefined) submission.teacherFeedback = newFeedback

        submission.status = "evaluated"
        submission.evaluatedAt = new Date()
        await submission.save()

        return res.status(200).json({ message: "Submission reviewed successfully", submission: teacherSubmissionView(submission, mediaBase(req)) })
    } catch (error) {
        console.log("reviewSubmission error:", error?.message || error)
        return res.status(500).json({ message: "The review could not be saved. Please try again." })
    }
}

export const releaseResults = async (req, res) => {
    try {
        const { assignmentId } = req.params
        const assignment = await Assignment.findById(assignmentId)
        if (!assignment) return res.status(404).json({ message: "Assignment not found" })

        const ownership = await ensureCourseOwner(assignment.course, req.userId)
        if (ownership.error) return res.status(ownership.status).json({ message: ownership.error })

        assignment.resultsReleased = true
        await assignment.save()

        return res.status(200).json({ message: "Results released to students", assignment })
    } catch (error) {
        return res.status(500).json({ message: `Failed to release results ${error}` })
    }
}

// ---------------------------------------------------------------------
// Teacher dashboard summary
// ---------------------------------------------------------------------
export const getAssignmentDashboardSummary = async (req, res) => {
    try {
        const { courseId } = req.params
        const ownership = await ensureCourseOwner(courseId, req.userId)
        if (ownership.error) return res.status(ownership.status).json({ message: ownership.error })

        const assignments = await Assignment.find({ course: courseId })
        const assignmentIds = assignments.map(a => a._id)
        const submissions = await AssignmentSubmission.find({ assignment: { $in: assignmentIds } })

        const course = await Course.findById(courseId)
        const enrolledCount = course?.enrolledStudents?.length || 0

        let totalExpected = 0
        assignments.forEach(a => { if (a.status === "published") totalExpected += enrolledCount })

        const submittedCount = submissions.length
        const pendingReviewCount = submissions.filter(s => s.status === "submitted" || s.status === "under_review").length
        const overdueCount = assignments.filter(a => a.status === "published" && isPastDue(a)).reduce((count, a) => {
            const submittedForThis = submissions.filter(s => s.assignment.toString() === a._id.toString()).length
            return count + Math.max(0, enrolledCount - submittedForThis)
        }, 0)
        const evaluated = submissions.filter(s => s.finalMarks !== null)
        const averageScorePercent = evaluated.length
            ? Math.round(evaluated.reduce((sum, s) => {
                const a = assignments.find(x => x._id.toString() === s.assignment.toString())
                return sum + (a && a.maxMarks ? (s.finalMarks / a.maxMarks) * 100 : 0)
            }, 0) / evaluated.length)
            : null
        const aiEvaluationsCompleted = submissions.filter(s => s.aiSuggestedMarks !== null).length
        const potentialDuplicates = submissions.filter(s => s.duplicateStatus !== "none").length

        return res.status(200).json({
            totalAssignments: assignments.length,
            submittedCount,
            pendingCount: pendingReviewCount,
            overdueCount,
            averageScorePercent,
            aiEvaluationsCompleted,
            pendingReviewCount,
            potentialDuplicates
        })
    } catch (error) {
        return res.status(500).json({ message: `Failed to fetch dashboard summary ${error}` })
    }
}
