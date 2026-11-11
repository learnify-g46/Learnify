import express from "express"
import { chatWithAi, getRecommendations, liveSearch, searchWithAi } from "../controllers/aiController.js"
import { aiSearchLimiter, liveSearchLimiter } from "../middlewares/rateLimit.js"
import isAuth from "../middlewares/isAuth.js"

let aiRouter = express.Router()

aiRouter.post("/search",aiSearchLimiter,searchWithAi)
aiRouter.post("/live-search",liveSearchLimiter,liveSearch)
aiRouter.post("/chat", isAuth, chatWithAi)
aiRouter.get("/recommendations", isAuth, getRecommendations)

export default aiRouter