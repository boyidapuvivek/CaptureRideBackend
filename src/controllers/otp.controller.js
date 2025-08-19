import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponce } from "../utils/ApiResponse.js"
import { OTP } from "../models/otp.models.js"
import { User } from "../models/user.models.js"
import { emailService } from "../utils/emailServices.js"

// Generate and send OTP
const generateOTP = asyncHandler(async (req, res) => {
  const { email, purpose = "email_verification" } = req.body

  if (!email) {
    throw new ApiError(400, "Email is required")
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new ApiError(400, "Please provide a valid email address")
  }

  // Check if purpose is valid
  const validPurposes = [
    "email_verification",
    "password_reset",
    "login_verification",
  ]
  if (!validPurposes.includes(purpose)) {
    throw new ApiError(400, "Invalid OTP purpose")
  }

  try {
    // For password reset, check if user exists
    if (purpose === "password_reset") {
      const user = await User.findOne({ email })
      if (!user) {
        throw new ApiError(404, "No user found with this email address")
      }
    }

    // For email verification during registration, check if user already verified
    if (purpose === "email_verification") {
      const user = await User.findOne({ email })
      if (user) {
        throw new ApiError(409, "Email is already registered and verified")
      }
    }

    // Generate OTP with 10 minutes expiry
    const otpDoc = await OTP.createOTP(email, purpose, 10)

    // Send OTP via email
    const emailResult = await emailService.sendOTPEmail(
      email,
      otpDoc.otp,
      purpose
    )

    if (!emailResult.success) {
      // Delete the OTP if email sending failed
      await otpDoc.deleteOne()
      throw new ApiError(500, "Failed to send OTP email. Please try again.")
    }

    return res.status(200).json(
      new ApiResponce(
        200,
        {
          email,
          purpose,
          expiresAt: otpDoc.expiresAt,
          emailSent: true,
        },
        "OTP sent successfully to your email"
      )
    )
  } catch (error) {
    // If it's already an ApiError, re-throw it
    if (error instanceof ApiError) {
      throw error
    }

    console.error("Error in generateOTP:", error)
    throw new ApiError(500, "Something went wrong while generating OTP")
  }
})

// Verify OTP
const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp, purpose = "email_verification" } = req.body

  if (!email || !otp) {
    throw new ApiError(400, "Email and OTP are required")
  }

  if (!purpose) {
    throw new ApiError(400, "Purpose is required")
  }

  try {
    // First, find the OTP document to increment attempts
    const otpDoc = await OTP.findOne({
      email,
      purpose,
      isUsed: false,
    })

    if (!otpDoc) {
      throw new ApiError(404, "No valid OTP found for this email")
    }

    // Increment attempts
    otpDoc.attempts += 1
    await otpDoc.save()

    // Verify the OTP
    const verificationResult = await OTP.verifyOTP(email, otp, purpose)

    if (!verificationResult.success) {
      throw new ApiError(400, verificationResult.message)
    }

    // Handle post-verification actions based on purpose
    let responseData = {
      email,
      purpose,
      verified: true,
    }

    if (purpose === "email_verification") {
      // For email verification, you might want to update user verification status
      // This is handled in your user registration flow
      responseData.message =
        "Email verified successfully. You can now complete your registration."
    } else if (purpose === "password_reset") {
      // For password reset, generate a temporary token for password reset
      responseData.message = "OTP verified. You can now reset your password."
      responseData.resetAllowed = true
    } else if (purpose === "login_verification") {
      // For login verification
      responseData.message = "Login verification successful."
      responseData.loginAllowed = true
    }

    return res
      .status(200)
      .json(new ApiResponce(200, responseData, verificationResult.message))
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    console.error("Error in verifyOTP:", error)
    throw new ApiError(500, "Something went wrong while verifying OTP")
  }
})

// Resend OTP
const resendOTP = asyncHandler(async (req, res) => {
  const { email, purpose = "email_verification" } = req.body

  if (!email) {
    throw new ApiError(400, "Email is required")
  }

  try {
    // Check if there's a recent OTP that hasn't expired
    const recentOTP = await OTP.findOne({
      email,
      purpose,
      createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) }, // Within last 2 minutes
    })

    if (recentOTP) {
      throw new ApiError(
        429,
        "Please wait at least 2 minutes before requesting a new OTP"
      )
    }

    // Generate new OTP
    const otpDoc = await OTP.createOTP(email, purpose, 10)

    // Send OTP via email
    const emailResult = await emailService.sendOTPEmail(
      email,
      otpDoc.otp,
      purpose
    )

    if (!emailResult.success) {
      await otpDoc.deleteOne()
      throw new ApiError(500, "Failed to send OTP email. Please try again.")
    }

    return res.status(200).json(
      new ApiResponce(
        200,
        {
          email,
          purpose,
          expiresAt: otpDoc.expiresAt,
          emailSent: true,
        },
        "OTP resent successfully"
      )
    )
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    console.error("Error in resendOTP:", error)
    throw new ApiError(500, "Something went wrong while resending OTP")
  }
})

// Check OTP status
const checkOTPStatus = asyncHandler(async (req, res) => {
  const { email, purpose = "email_verification" } = req.query

  if (!email) {
    throw new ApiError(400, "Email is required")
  }

  try {
    const otpDoc = await OTP.findOne({
      email,
      purpose,
      isUsed: false,
    }).select("email purpose attempts expiresAt createdAt")

    if (!otpDoc) {
      return res.status(200).json(
        new ApiResponce(
          200,
          {
            email,
            purpose,
            hasActiveOTP: false,
          },
          "No active OTP found"
        )
      )
    }

    const isExpired = otpDoc.isExpired()
    const attemptsLeft = Math.max(0, 3 - otpDoc.attempts)

    return res.status(200).json(
      new ApiResponce(
        200,
        {
          email,
          purpose,
          hasActiveOTP: !isExpired,
          isExpired,
          attemptsLeft,
          expiresAt: otpDoc.expiresAt,
          sentAt: otpDoc.createdAt,
        },
        isExpired ? "OTP has expired" : "Active OTP found"
      )
    )
  } catch (error) {
    console.error("Error in checkOTPStatus:", error)
    throw new ApiError(500, "Something went wrong while checking OTP status")
  }
})

// Admin function to cleanup expired OTPs (optional)
const cleanupExpiredOTPs = asyncHandler(async (req, res) => {
  try {
    const result = await OTP.deleteMany({
      expiresAt: { $lt: new Date() },
    })

    return res
      .status(200)
      .json(
        new ApiResponce(
          200,
          { deletedCount: result.deletedCount },
          "Expired OTPs cleaned up successfully"
        )
      )
  } catch (error) {
    console.error("Error in cleanupExpiredOTPs:", error)
    throw new ApiError(500, "Something went wrong while cleaning up OTPs")
  }
})

export { generateOTP, verifyOTP, resendOTP, checkOTPStatus, cleanupExpiredOTPs }
