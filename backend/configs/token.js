import jwt from "jsonwebtoken"
export const genToken = async (userId, tv = 0) => {
    try {
        return jwt.sign({ userId, tv }, process.env.JWT_SECRET, { expiresIn: "7d" })
    } catch (error) {
        console.log("token error")
    }
}
