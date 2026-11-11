import { createRemoteJWKSet, jwtVerify } from "jose"

// Verifies a Firebase ID token (what `user.getIdToken()` returns on the frontend).
// Only the Firebase PROJECT ID is needed - no service account / private key.
//   FIREBASE_PROJECT_ID  (default: the project used by frontend/utils/Firebase.js)
//   FIREBASE_JWKS_URL    (optional, only for tests - points at a local key set)
const JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"

let jwks
const getJwks = () => {
    const url = process.env.FIREBASE_JWKS_URL || JWKS_URL
    if (!jwks || jwks.url !== url) {
        jwks = { url, set: createRemoteJWKSet(new URL(url), { cooldownDuration: 30000 }) }
    }
    return jwks.set
}

export const verifyFirebaseIdToken = async (idToken) => {
    const projectId = process.env.FIREBASE_PROJECT_ID || "mainlms-78eba"
    const { payload } = await jwtVerify(idToken, getJwks(), {
        issuer: `https://securetoken.google.com/${projectId}`,
        audience: projectId,
        algorithms: ["RS256"]
    })
    if (!payload.sub) throw new Error("token has no subject")
    return payload // email, email_verified, name, picture, ...
}
