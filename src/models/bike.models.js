import mongoose from "mongoose"

const BikeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bikeName: {
      type: String,
      required: true,
    },
    bikeNumber: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

export const Bikes = mongoose.model("Bikes", BikeSchema)
