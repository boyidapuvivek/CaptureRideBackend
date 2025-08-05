import mongoose from "mongoose"

const rideSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    roomNumber: {
      type: String,
      required: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    vehicleNumber: {
      type: String,
      required: true,
    },
    aadharPhoto: {
      type: String,
      required: true,
    },
    dlPhoto: {
      type: String,
      required: true,
    },
    customerPhoto: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["processing", "completed", "failed", "partial_failure"],
      default: "processing",
    },
    error: {
      type: String,
      default: "NO ERROR",
    },
  },
  {
    timestamps: true,
  }
)

export const Ride = mongoose.model("Ride", rideSchema)
