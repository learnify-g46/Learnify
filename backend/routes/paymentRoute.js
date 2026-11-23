import express from "express"
import isAuth from "../middlewares/isAuth.js"
import { createOrder, verifyPayment, paymentsEnabled } from "../controllers/orderController.js"

let paymentRouter = express.Router()

// login first, then the "payments enabled" switch
paymentRouter.post("/create-order", isAuth, paymentsEnabled, createOrder)
paymentRouter.post("/verify-payment", isAuth, paymentsEnabled, verifyPayment)

export default paymentRouter
