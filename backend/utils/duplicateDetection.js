// Lightweight, dependency-free text-similarity check used to flag likely
// duplicate PDF/typed submissions for a teacher to look at. This is a
// similarity heuristic (n-gram shingle Jaccard index), not a plagiarism-
// detection product — it is always ADVISORY. A flagged submission is never
// auto-zeroed, auto-rejected, or hidden; the teacher sees the flag plus
// both submissions and decides.

export const SIMILARITY_DUPLICATE_THRESHOLD = 95

const tokenize = (text) => {
    return (text || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(Boolean)
}

const shingles = (tokens, n = 3) => {
    const set = new Set()
    for (let i = 0; i <= tokens.length - n; i++) {
        set.add(tokens.slice(i, i + n).join(" "))
    }
    return set
}

// Returns a 0-100 similarity percentage between two texts.
export const textSimilarityPercent = (textA, textB) => {
    const tokensA = tokenize(textA)
    const tokensB = tokenize(textB)

    if (tokensA.length < 3 || tokensB.length < 3) {
        // Too short for shingle comparison to mean anything - fall back to
        // a plain exact-match check so we don't produce a misleading score.
        const trimmedA = (textA || "").trim()
        const trimmedB = (textB || "").trim()
        return trimmedA && trimmedA === trimmedB ? 100 : 0
    }

    const setA = shingles(tokensA)
    const setB = shingles(tokensB)
    let intersection = 0
    for (const s of setA) if (setB.has(s)) intersection++
    const union = setA.size + setB.size - intersection
    if (union === 0) return 0
    return Math.round((intersection / union) * 100)
}
