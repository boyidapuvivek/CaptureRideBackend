import mongoose from "mongoose"

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    otp: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      required: true,
      enum: ["email_verification", "password_reset", "login_verification"],
      default: "email_verification",
    },
    attempts: {
      type: Number,
      default: 0,
      max: 3,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
  },
  {
    timestamps: true,
  }
)

// Index for faster queries
otpSchema.index({ email: 1, purpose: 1 })
otpSchema.index({ otp: 1, email: 1 })

// Method to check if OTP is expired
otpSchema.methods.isExpired = function () {
  return new Date() > this.expiresAt
}

// Method to check if OTP attempts are exhausted
otpSchema.methods.isAttemptsExhausted = function () {
  return this.attempts >= 3
}

// Static method to generate OTP
otpSchema.statics.generateOTP = function (length = 6) {
  const digits = "0123456789"
  let otp = ""
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)]
  }
  return otp
}

// Static method to create new OTP
otpSchema.statics.createOTP = async function (
  email,
  purpose = "email_verification",
  expiryMinutes = 10
) {
  // Delete any existing OTPs for this email and purpose
  await this.deleteMany({ email, purpose })

  const otp = this.generateOTP()
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000)

  const otpDoc = await this.create({
    email,
    otp,
    purpose,
    expiresAt,
  })

  return otpDoc
}

// Static method to verify OTP
otpSchema.statics.verifyOTP = async function (
  email,
  otp,
  purpose = "email_verification"
) {
  const otpDoc = await this.findOne({
    email,
    otp,
    purpose,
    isUsed: false,
  })

  if (!otpDoc) {
    return { success: false, message: "Invalid OTP" }
  }

  if (otpDoc.isExpired()) {
    await otpDoc.deleteOne()
    return { success: false, message: "OTP has expired" }
  }

  if (otpDoc.isAttemptsExhausted()) {
    await otpDoc.deleteOne()
    return { success: false, message: "Maximum attempts exceeded" }
  }

  // Mark as used and save
  otpDoc.isUsed = true
  await otpDoc.save()

  return { success: true, message: "OTP verified successfully" }
}

export const OTP = mongoose.model("OTP", otpSchema)
