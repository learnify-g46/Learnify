import express from "express"
import dotenv from "dotenv"
import connectDb from "./configs/db.js"
import authRouter from "./routes/authRoute.js"
import cookieParser from "cookie-parser"
import cors from "cors"
import userRouter from "./routes/userRoute.js"
import courseRouter from "./routes/courseRoute.js"
import paymentRouter from "./routes/paymentRoute.js"
import aiRouter from "./routes/aiRoute.js"
import reviewRouter from "./routes/reviewRoute.js"
import adminRouter from "./routes/adminRoute.js"
import quizRouter from "./routes/quizRoute.js"
import progressRouter from "./routes/progressRoute.js"
import gamificationRouter from "./routes/gamificationRoute.js"
import assignmentRouter from "./routes/assignmentRoute.js"
import { globalLimiter } from "./middlewares/rateLimit.js"
import helmet from "helmet"
import mediaRouter from "./routes/mediaRoute.js"
import { uploadErrorHandler, fallbackErrorHandler } from "./middlewares/multer.js"
dotenv.config()

let port = process.env.PORT
let app = express()
app.disable("x-powered-by")
// security headers (nosniff, frame protection, HSTS, ...). This server only returns JSON, so a strict policy is fine.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }))
app.use(express.json({ limit: "200kb" }))
app.use(cookieParser())
// CLIENT_URLS = comma separated list of allowed frontend origins (add your deployed URL here)
const allowedOrigins = (process.env.CLIENT_URLS || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",").map(o => o.trim().replace(/\/$/, "")).filter(Boolean)
// CSRF defence: browsers always send an Origin header on cross-site requests, so a state-changing request
// that comes from any site that is not ours is refused (this also covers form posts and file uploads)
app.use((req, res, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        const origin = req.headers.origin
        if (origin && !allowedOrigins.includes(origin)) {
            return res.status(403).json({ message: "Request blocked: it did not come from the Learnify website." })
        }
    }
    next()
})
app.use(cors({
    origin:(origin, cb) => (!origin || allowedOrigins.includes(origin)) ? cb(null, true) : cb(null, false),
    credentials:true
}))
// behind a proxy (Render, Nginx...) req.ip must be the real visitor, not the proxy
if (process.env.NODE_ENV === "production" || process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1)
app.use("/api/media", mediaRouter) // before globalLimiter: has its own, roomier limit
app.use("/api", globalLimiter)

// Error answers must never carry internal details (Mongoose / stack text). The full error stays in the
// server log; the browser gets a short, friendly message with the right status code.
const RAW_ERROR = /(\b\w*Error\b\s*[:\[]|CastError|ValidationError|E11000|\bat\s+\S+\s+\(.*:\d+:\d+\))/
app.use("/api", (req, res, next) => {
    const send = res.json.bind(res)
    res.json = (body) => {
        if (res.statusCode >= 400 && body && typeof body.message === "string" && !body.code && RAW_ERROR.test(body.message)) {
            console.log("(hidden from browser)", res.statusCode, body.message.slice(0, 300))
            if (/CastError|Cast to ObjectId/.test(body.message)) { res.status(400); body = { message: "Invalid request. Please check the details and try again." } }
            else if (/ValidationError/.test(body.message)) { res.status(400); body = { message: "Some of the details are invalid. Please check them and try again." } }
            else if (/E11000/.test(body.message)) { res.status(409); body = { message: "That already exists." } }
            else { res.status(500); body = { message: "Something went wrong on our side. Please try again." } }
        }
        return send(body)
    }
    next()
})
app.use("/api/auth", authRouter)
app.use("/api/user", userRouter)
app.use("/api/course", courseRouter)
app.use("/api/payment", paymentRouter)
app.use("/api/ai", aiRouter)
app.use("/api/review", reviewRouter)
app.use("/api/admin", adminRouter)
app.use("/api/quiz", quizRouter)
app.use("/api/progress", progressRouter)
app.use("/api/gamification", gamificationRouter)
app.use("/api/assignment", assignmentRouter)


app.get("/" , (req,res)=>{
    res.send("Hello From Server")
})

app.use(uploadErrorHandler)
app.use(fallbackErrorHandler)

// The login-token secret must be long and random. In production a weak one is a hard stop: anyone who can
// guess it can forge a login for any user, including an admin.
const secretLength = (process.env.JWT_SECRET || "").length
if (secretLength < 32) {
    const how = "Use a long random value (64+ characters) in .env, e.g. run: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""
    if (process.env.NODE_ENV === "production") {
        console.error(`FATAL: JWT_SECRET is missing or shorter than 32 characters, so the server will not start in production. ${how}`)
        process.exit(1)
    }
    console.warn(`SECURITY WARNING: JWT_SECRET is shorter than 32 characters. ${how}`)
}

// Start listening only after MongoDB is connected, so the server never answers requests it cannot serve.
try {
    await connectDb()
} catch (error) {
    console.error("FATAL: could not connect to MongoDB:", error.message)
    console.error("Check MONGODB_URL in backend/.env, your internet connection, and (for Atlas) the IP allow-list.")
    process.exit(1)
}
app.listen(port , ()=>{
    console.log("Server Started")
})
