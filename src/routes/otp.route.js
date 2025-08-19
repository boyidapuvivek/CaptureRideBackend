import { Router } from "express"
import {
  generateOTP,
  verifyOTP,
  resendOTP,
  checkOTPStatus,
  cleanupExpiredOTPs,
} from "../controllers/otp.controller.js"
import verifyJwt from "../middlewares/auth.middleware.js"

const router = Router()

// Public routes - no authentication required
router.route("/generate").post(generateOTP)
router.route("/verify").post(verifyOTP)
router.route("/resend").post(resendOTP)
router.route("/status").get(checkOTPStatus)

// Protected routes - authentication required
router.route("/cleanup").delete(verifyJwt, cleanupExpiredOTPs)

export default router
