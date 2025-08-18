import { Ride } from "../models/ride.models.js"
import { uploadToCloudinaryFromBuffer } from "./cloudinary.js"

export async function processRidePhotosInBackground(rideID, fileData) {
  try {
    const { aadharFile, dlFile, customerPhotoFile } = fileData

    const uploadPromise = [
      uploadToCloudinaryFromBuffer(aadharFile.buffer, aadharFile.originalname),
      uploadToCloudinaryFromBuffer(dlFile.buffer, dlFile.originalname),
      uploadToCloudinaryFromBuffer(
        customerPhotoFile.buffer,
        customerPhotoFile.originalname
      ),
    ]

    const [aadharPhoto, dlPhoto, customerPhoto] =
      await Promise.allSettled(uploadPromise)

    const updateData = {
      status: "completed",
      updatedAt: new Date(),
    }

    if (aadharPhoto.status === "fulfilled" && aadharPhoto.value) {
      updateData.aadharPhoto = aadharPhoto.value.secure_url
      updateData.aadharPublicPhoto = aadharPhoto.value.public_id
    } else {
      updateData.aadharPhotoError = "Upload Failed"
      console.error("Aadhar upload failed:", aadharPhoto.reason)
    }

    if (dlPhoto.status === "fulfilled" && dlPhoto.value) {
      updateData.dlPhoto = dlPhoto.value.secure_url
      updateData.dlPublicPhoto = dlPhoto.value.public_id
    } else {
      updateData.dlPhotoError = "Upload Failed"
      console.error("DL upload failed:", dlPhoto.reason)
    }

    if (customerPhoto.status === "fulfilled" && customerPhoto.value) {
      updateData.customerPhoto = customerPhoto.value.secure_url
      updateData.customerPublicPhoto = customerPhoto.value.public_id
    } else {
      updateData.customerPhotoError = "Upload Failed"
      console.error("Customer photo upload failed:", customerPhoto.reason)
    }

    const hasErrors =
      updateData.aadharPhotoError ||
      updateData.dlPhotoError ||
      updateData.customerPhotoError
    if (hasErrors) {
      updateData.status = "partial_failure"
    }

    await Ride.findByIdAndUpdate(rideID, updateData)
  } catch (error) {
    console.error(`Background processing failed for ride ${rideID}:`, error)

    await Ride.findByIdAndUpdate(rideID, {
      status: "failed",
      error: error.message,
      updatedAt: new Date(),
    }).catch(console.error)
  }
}
