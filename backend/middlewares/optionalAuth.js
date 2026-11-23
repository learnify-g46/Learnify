import jwt from "jsonwebtoken"
import User from "../models/userModel.js"

// For public routes that show a bit more to a logged-in viewer: sets req.userId when a valid
// session cookie is present, and silently carries on as a visitor otherwise. Never blocks.
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.cookies?.token
        if (token) {
            const payload = jwt.verify(token, process.env.JWT_SECRET)
            const user = await User.findById(payload.userId).select("tokenVersion")
            if (user && (payload.tv || 0) === (user.tokenVersion || 0)) req.userId = payload.userId
        }
    } catch {
        // bad / expired token -> treated as a visitor
    }
    next()
}
export default optionalAuth
