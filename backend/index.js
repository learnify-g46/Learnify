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
dotenv.config()

let port = process.env.PORT
let app = express()
app.use(express.json())
app.use(cookieParser())
// CLIENT_URLS = comma separated list of allowed frontend origins (add your deployed URL here)
const allowedOrigins = (process.env.CLIENT_URLS || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",").map(o => o.trim().replace(/\/$/, "")).filter(Boolean)
app.use(cors({
    origin:(origin, cb) => (!origin || allowedOrigins.includes(origin)) ? cb(null, true) : cb(null, false),
    credentials:true
}))
// behind a proxy (Render, Nginx...) req.ip must be the real visitor, not the proxy
if (process.env.NODE_ENV === "production" || process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1)
app.use("/api", globalLimiter)
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

app.listen(port , ()=>{
    console.log("Server Started")
    connectDb()
})

