import express from "express"
import { chatWithAi, getRecommendations, searchWithAi } from "../controllers/aiController.js"
import isAuth from "../middlewares/isAuth.js"

let aiRouter = express.Router()

aiRouter.post("/search",searchWithAi)
aiRouter.post("/chat", isAuth, chatWithAi)
aiRouter.get("/recommendations", isAuth, getRecommendations)

export default aiRouter