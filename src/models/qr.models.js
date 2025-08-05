import mongoose from "mongoose"

const QrSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bankName: {
      type: String,
      required: true,
    },
    qrPhoto: {
      type: String,
      required: true,
    },
    qrPhotoPublicId: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

export const Qr = mongoose.model("Qr", QrSchema)
