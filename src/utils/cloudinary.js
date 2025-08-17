import { v2 as cloudinary } from "cloudinary"
import { ApiError } from "./ApiError.js"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
})

// Upload from buffer (memory storage)
const uploadToCloudinaryFromBuffer = async (buffer, filename) => {
  try {
    if (!buffer) return null

    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: "auto",
            public_id: `ride_documents/${Date.now()}-${filename}`,
            quality: "auto:good",
            fetch_format: "auto",
            flags: "progressive",
            timeout: 120000,
            chunk_size: 6000000,
            folder: "ride_documents",
            eager: [
              { width: 300, height: 300, crop: "thumb", quality: "auto:low" },
            ],
            eager_async: true,
          },
          (error, result) => {
            if (error) {
              console.error("Cloudinary upload error:", error)
              reject(error)
            } else {
              resolve(result)
            }
          }
        )
        .end(buffer)
    })
  } catch (error) {
    console.error("Cloudinary upload error:", error)
    return null
  }
}

// Keep the original function for backward compatibility (if needed)
const uploadToCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      quality: "auto:good",
      fetch_format: "auto",
      flags: "progressive",
      timeout: 120000,
      chunk_size: 6000000,
      folder: "ride_documents",
      eager: [{ width: 300, height: 300, crop: "thumb", quality: "auto:low" }],
      eager_async: true,
    })

    return response
  } catch (error) {
    console.error("Cloudinary upload error:", error)
    return null
  }
}

const deleteFromCloudinary = async (publicId) => {
  if (!publicId) {
    throw new ApiError(401, "Public Id is required for cloudinary delete")
  }
  return await cloudinary.uploader.destroy(publicId)
}

export {
  uploadToCloudinary,
  uploadToCloudinaryFromBuffer,
  deleteFromCloudinary,
}
