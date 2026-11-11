import jwt from "jsonwebtoken"
import User from "../models/userModel.js"

const isAuth = async (req, res, next) => {
    try {
        let { token } = req.cookies

        if (!token) {
            return res.status(400).json({ message: "user doesn't have token" })
        }

        let payload
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET)
        } catch (e) {
            return res.status(401).json({ message: "Session expired. Please log in again." })
        }

        // logout / password reset bumps tokenVersion - old tokens (no `tv` = version 0) stop working
        const user = await User.findById(payload.userId).select("tokenVersion")
        if (!user || (payload.tv || 0) !== (user.tokenVersion || 0)) {
            return res.status(401).json({ message: "Session expired. Please log in again." })
        }

        req.userId = payload.userId
        next()
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: `is auth error ${error}` })
    }
}
export default isAuth
