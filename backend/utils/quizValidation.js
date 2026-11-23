// Checks for quiz questions, whether they come from a teacher's form or from the AI.
const text = (v, min, max) => (typeof v === "string" && v.trim().length >= min && v.trim().length <= max ? v.trim() : null)

// -> { question } or { error }. correctOptionIndex must really point at one of the options.
export const checkQuestion = (q) => {
    if (!q || typeof q !== "object" || Array.isArray(q)) return { error: "is not a question" }
    const questionText = text(q.questionText, 3, 500)
    if (!questionText) return { error: "needs question text (3-500 characters)" }
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6) return { error: "needs 2 to 6 options" }
    const options = q.options.map(o => text(typeof o === "number" ? String(o) : o, 1, 300))
    if (options.some(o => o === null)) return { error: "has an empty or too long option" }
    if (new Set(options.map(o => o.toLowerCase())).size !== options.length) return { error: "has two identical options" }
    const raw = typeof q.correctOptionIndex === "string" && /^\d+$/.test(q.correctOptionIndex.trim()) ? Number(q.correctOptionIndex) : q.correctOptionIndex
    if (!Number.isInteger(raw) || raw < 0 || raw >= options.length) return { error: "has a correct answer that is not one of the options" }
    return { question: { questionText, options, correctOptionIndex: raw } }
}

// Teacher-submitted list: every question must be valid.
export const validateQuestionList = (list) => {
    if (!Array.isArray(list) || list.length === 0) return { error: "At least one question is required" }
    if (list.length > 50) return { error: "A quiz can have at most 50 questions" }
    const out = []
    for (let i = 0; i < list.length; i++) {
        const r = checkQuestion(list[i])
        if (r.error) return { error: `Question ${i + 1} ${r.error}.` }
        out.push(r.question)
    }
    return { questions: out }
}

// AI output: keep the usable questions, drop the rest (and say how many were dropped).
export const cleanAiQuestions = (parsed) => {
    const list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.questions) ? parsed.questions : null)
    if (!list) return { error: "not a list" }
    const questions = []
    for (const item of list.slice(0, 50)) {
        const r = checkQuestion(item)
        if (r.question) questions.push(r.question)
    }
    return { questions, dropped: list.length - questions.length }
}

export const validateTitle = (title) => text(title, 1, 120)

// answers: one chosen option index (or null = skipped) per question, in order
export const validateAnswers = (answers, questionCount) => {
    if (!Array.isArray(answers) || answers.length > questionCount) return null
    const out = []
    for (let i = 0; i < questionCount; i++) {
        const a = answers[i]
        if (a === undefined || a === null) { out.push(null); continue }
        if (!Number.isInteger(a) || a < 0 || a > 5) return null
        out.push(a)
    }
    return out
}

// seconds spent: a real number between 0 and 24 hours; missing counts as 0
export const validateSeconds = (value) => {
    if (value === undefined || value === null || value === "") return 0
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 24 * 3600) return null
    return Math.round(value)
}
