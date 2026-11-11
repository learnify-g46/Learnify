// Turns any login / Google / network error into a short message a person can act on.
// Never throws (the old `error.response.data.message` crashed on Firebase errors).
const FIREBASE_MESSAGES = {
  "auth/popup-closed-by-user": "Google sign-in was closed before it finished. Please try again.",
  "auth/cancelled-popup-request": "Another sign-in window is already open. Please finish or close it first.",
  "auth/popup-blocked": "Your browser blocked the Google sign-in popup. Please allow popups for this site and try again.",
  "auth/unauthorized-domain": "This website address is not authorised for Google sign-in. Add it under Firebase → Authentication → Settings → Authorized domains.",
  "auth/operation-not-allowed": "Google sign-in is not enabled for this project. Enable it in Firebase → Authentication → Sign-in method.",
  "auth/invalid-api-key": "Google sign-in is not configured correctly (invalid API key). Please check VITE_FIREBASE_APIKEY.",
  "auth/api-key-not-valid.-please-pass-a-valid-api-key.": "Google sign-in is not configured correctly (invalid API key). Please check VITE_FIREBASE_APIKEY.",
  "auth/network-request-failed": "Network problem while contacting Google. Please check your connection and try again.",
  "auth/too-many-requests": "Too many attempts. Please wait a little and try again.",
  "auth/user-disabled": "This Google account has been disabled."
}

export const getErrorMessage = (error, fallback = "Something went wrong. Please try again.") => {
  try {
    if (error?.response) {
      const msg = error.response.data?.message
      if (msg) return String(msg)
      return fallback
    }
    if (error?.code && FIREBASE_MESSAGES[error.code]) return FIREBASE_MESSAGES[error.code]
    if (error?.code?.startsWith?.("auth/")) return `Google sign-in failed (${error.code}). Please try again.`
    if (error?.request || error?.message === "Network Error") return "We couldn't reach the server. Please check that the backend is running and try again."
  } catch (e) { /* fall through */ }
  return fallback
}

// closing the popup is not an error worth shouting about
export const isSilentGoogleError = (error) =>
  error?.code === "auth/popup-closed-by-user" || error?.code === "auth/cancelled-popup-request"
