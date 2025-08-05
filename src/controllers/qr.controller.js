import { Qr } from "../models/qr.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponce } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadToCloudinary } from "../utils/cloudinary.js"
import { deleteFromCloudinary } from "../utils/cloudinary.js"

const addQr = asyncHandler(async (req, res) => {
  const qrPhoto = req?.files?.qrPhoto?.[0]?.path
  const { bankName } = req?.body

  if (!qrPhoto) {
    throw new ApiError(400, "qrPhoto is required")
  }

  const qrPhotoRes = await uploadToCloudinary(qrPhoto)

  const qr = await Qr.create({
    userId: req?.user?._id,
    qrPhoto: qrPhotoRes?.secure_url,
    qrPhotoPublicId: qrPhotoRes?.public_id,
    bankName: bankName,
  })

  if (!qr) {
    throw new ApiError(500, "Something went wrong while uploading qrPhoto")
  }

  res
    .status(201)
    .json(
      new ApiResponce(
        201,
        { message: "Qr successfully uploaded" },
        "Qr successfully uploaded"
      )
    )
})

const getQr = asyncHandler(async (req, res) => {
  const userId = req?.user?._id

  if (!userId) {
    throw new ApiError(401, "Unauthorized access")
  }

  const qrs = await Qr.find({ userId }).sort({ createdAt: -1 })

  if (!qrs) {
    throw new ApiError(500, "Something went wrong while fetching data")
  }

  res
    .status(200)
    .json(
      new ApiResponce(200, { qrs }, "Fetched user's Qr Documents successfully")
    )
})

const deleteQr = asyncHandler(async (req, res) => {
  const qrId = req?.query?.id
  const userId = req?.user?._id

  const qr = await Qr.findOne({ _id: qrId, userId })

  if (!qr) {
    throw new ApiError(404, "QR not found")
  }

  // Delete from Cloudinary
  const cloudinaryRes = await deleteFromCloudinary(qr?.qrPhotoPublicId)

  if (cloudinaryRes.result !== "ok") {
    console.log("❤️", cloudinaryRes)

    throw new ApiError(500, "Failed to delete image from Cloudinary")
  }

  // Delete from DB
  await qr.deleteOne()

  res.status(200).json(new ApiResponce(200, {}, "QR deleted successfully"))
})

export { addQr, getQr, deleteQr }
