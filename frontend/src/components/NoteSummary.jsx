import React, { useState } from 'react'
import axios from 'axios'
import { serverUrl } from '../App'
import { FaMagic, FaCopy, FaSyncAlt } from 'react-icons/fa'
import { toast } from 'react-toastify'

// "Summarize" button + result card for one study material. The summary is made once on the server
// and reused for every student, so a repeat click is instant.
const canSummarize = (name = "") => /\.(pdf|docx|pptx|txt)$/i.test(name)

function NoteSummary({ lectureId, resource, canRegenerate = false }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState("")

  if (!canSummarize(resource.name)) return null

  const load = async (regenerate = false) => {
    setLoading(true); setError("")
    try {
      const result = await axios.post(serverUrl + "/api/ai/summarize-note", { lectureId, resourceId: resource._id, ...(regenerate ? { regenerate: true } : {}) }, { withCredentials: true })
      setData(result.data)
    } catch (err) {
      setError(err.response?.data?.message || "The summary could not be made right now. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next && !data && !loading) load()
  }

  const copy = async () => {
    const text = [
      data.summary, "",
      "Key points:", ...data.keyPoints.map(p => `- ${p}`),
      ...(data.terms?.length ? ["", "Important terms:", ...data.terms.map(t => `- ${t.term}: ${t.meaning}`)] : []),
      ...(data.questions?.length ? ["", "Practice questions:", ...data.questions.map((q, i) => `${i + 1}. ${q}`)] : [])
    ].join("\n")
    try { await navigator.clipboard.writeText(text); toast.success("Summary copied") } catch { toast.error("Could not copy") }
  }

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={toggle}
        className="flex items-center gap-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 hover:underline"
      >
        <FaMagic /> {open ? "Hide summary" : (resource.hasSummary ? "View summary" : "Summarize")}
      </button>
      {open && (
        <div className="mt-2 rounded-lg border border-purple-200 dark:border-purple-900 bg-purple-50/60 dark:bg-purple-950/30 p-3 text-sm text-gray-700 dark:text-gray-200">
          {loading && <p className="animate-pulse">Reading the note and writing a summary…</p>}
          {!loading && error && (
            <div>
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <button type="button" onClick={() => load()} className="mt-1 text-xs underline">Try again</button>
            </div>
          )}
          {!loading && data && (
            <div className="space-y-3">
              <p>{data.summary}</p>
              <div>
                <h4 className="font-semibold mb-1">Key points</h4>
                <ul className="list-disc pl-5 space-y-0.5">{data.keyPoints.map((p, i) => <li key={i}>{p}</li>)}</ul>
              </div>
              {data.terms?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-1">Important terms</h4>
                  <ul className="space-y-0.5">{data.terms.map((t, i) => <li key={i}><span className="font-medium">{t.term}:</span> {t.meaning}</li>)}</ul>
                </div>
              )}
              {data.questions?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-1">Practice questions</h4>
                  <ol className="list-decimal pl-5 space-y-0.5">{data.questions.map((q, i) => <li key={i}>{q}</li>)}</ol>
                </div>
              )}
              {data.truncated && <p className="text-xs text-gray-500">This note is very long, so only the first part was summarized.</p>}
              <div className="flex items-center gap-3 pt-1 text-xs">
                <button type="button" onClick={copy} className="flex items-center gap-1 underline"><FaCopy /> Copy</button>
                {canRegenerate && <button type="button" onClick={() => load(true)} className="flex items-center gap-1 underline"><FaSyncAlt /> Regenerate</button>}
                <span className="text-gray-400">AI-made summary - check the original note for details.</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NoteSummary
