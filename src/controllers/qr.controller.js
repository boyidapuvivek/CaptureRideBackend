import { Qr } from "../models/qr.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponce } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadToCloudinaryFromBuffer } from "../utils/cloudinary.js"
import { deleteFromCloudinary } from "../utils/cloudinary.js"

const addQr = asyncHandler(async (req, res) => {
  const { bankName } = req.body

  // Validate bank name
  if (!bankName || bankName.trim() === "") {
    throw new ApiError(400, "Bank name is required")
  }

  // For memory storage, use req.files for upload.fields() or req.file for upload.single()
  const qrPhotoFile = req?.files?.qrPhoto?.[0]

  if (!qrPhotoFile) {
    throw new ApiError(400, "qrPhoto is required")
  }

  // Validate that file has buffer (memory storage check)
  if (!qrPhotoFile.buffer) {
    throw new ApiError(
      400,
      "Invalid file format - file must be uploaded properly"
    )
  }

  try {
    // Upload buffer to Cloudinary
    const qrPhotoRes = await uploadToCloudinaryFromBuffer(
      qrPhotoFile.buffer,
      qrPhotoFile.originalname
    )

    if (!qrPhotoRes) {
      throw new ApiError(500, "Failed to upload image to Cloudinary")
    }

    const qr = await Qr.create({
      userId: req?.user?._id,
      qrPhoto: qrPhotoRes.secure_url || qrPhotoRes.url,
      qrPhotoPublicId: qrPhotoRes.public_id,
      bankName: bankName.trim(),
    })

    if (!qr) {
      throw new ApiError(500, "Something went wrong while creating QR record")
    }

    res.status(201).json(
      new ApiResponce(
        201,
        {
          qrId: qr._id,
          message: "QR successfully uploaded",
          qrPhoto: qr.qrPhoto,
          bankName: qr.bankName,
        },
        "QR successfully uploaded"
      )
    )
  } catch (error) {
    console.error("QR upload error:", error)
    // No file cleanup needed for memory storage
    throw error
  }
})

const getQr = asyncHandler(async (req, res) => {
  const userId = req?.user?._id

  if (!userId) {
    throw new ApiError(401, "Unauthorized access")
  }

  try {
    const qrs = await Qr.find({ userId }).sort({ createdAt: -1 }).lean()

    // Always return an array, even if empty
    res
      .status(200)
      .json(
        new ApiResponce(
          200,
          { qrs: qrs || [] },
          qrs.length > 0 ?
            "Fetched user's QR Documents successfully"
          : "No QR codes found"
        )
      )
  } catch (error) {
    console.error("Error fetching QRs:", error)
    throw new ApiError(500, "Something went wrong while fetching QR data")
  }
})

const deleteQr = asyncHandler(async (req, res) => {
  const qrId = req?.query?.id
  const userId = req?.user?._id

  if (!qrId) {
    throw new ApiError(400, "QR ID is required")
  }

  try {
    const qr = await Qr.findOne({ _id: qrId, userId })

    if (!qr) {
      throw new ApiError(404, "QR not found or doesn't belong to user")
    }

    // Delete from Cloudinary if public ID exists
    if (qr.qrPhotoPublicId) {
      try {
        const cloudinaryRes = await deleteFromCloudinary(qr.qrPhotoPublicId)
      } catch (cloudinaryError) {
        console.error("Cloudinary deletion error:", cloudinaryError)
        // Continue with database deletion even if Cloudinary fails
      }
    }

    // Delete from database
    await Qr.deleteOne({ _id: qrId, userId })

    res.status(200).json(new ApiResponce(200, null, "QR deleted successfully"))
  } catch (error) {
    console.error("Error deleting QR:", error)
    throw error
  }
})

export { addQr, getQr, deleteQr }
