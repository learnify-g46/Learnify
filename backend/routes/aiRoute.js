import express from "express"
import { chatWithAi, getRecommendations, liveSearch, searchWithAi } from "../controllers/aiController.js"
import { summarizeNote } from "../controllers/noteSummaryController.js"
import { aiSearchLimiter, liveSearchLimiter, summarizeLimiter } from "../middlewares/rateLimit.js"
import isAuth from "../middlewares/isAuth.js"

let aiRouter = express.Router()

aiRouter.post("/search",aiSearchLimiter,searchWithAi)
aiRouter.post("/live-search",liveSearchLimiter,liveSearch)
aiRouter.post("/chat", isAuth, chatWithAi)
aiRouter.post("/summarize-note", isAuth, summarizeLimiter, summarizeNote)
aiRouter.get("/recommendations", isAuth, getRecommendations)

export default aiRouter