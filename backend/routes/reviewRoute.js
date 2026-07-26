import express from "express"
import isAuth from "../middlewares/isAuth.js"
import { addReview, getAllReviews } from "../controllers/reviewController.js"



let reviewRouter = express.Router()

reviewRouter.post("/givereview",isAuth,addReview)
reviewRouter.get("/allReview",getAllReviews)


export default reviewRouter