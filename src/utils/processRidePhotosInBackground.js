import { Ride } from "../models/ride.models.js"
import { uploadToCloudinary } from "./cloudinary.js"

export async function processRidePhotosInBackground(rideID, filePaths) {
  try {
    const { aadharLocalPath, dlLocalPath, customerPhotoLocalPath } = filePaths

    const uploadPromise = [
      uploadToCloudinary(aadharLocalPath),
      uploadToCloudinary(dlLocalPath),
      uploadToCloudinary(customerPhotoLocalPath),
    ]
    const [aadharPhoto, dlPhoto, customerPhoto] =
      await Promise.allSettled(uploadPromise)

    const updateData = {
      status: "completed",
      updatedAt: new Date(),
    }

    if (aadharPhoto.status === "fulfilled" && aadharPhoto.value) {
      updateData.aadharPhoto = aadharPhoto.value.url
      updateData.aadharPublicPhoto = aadharPhoto.value.public_id
    } else {
      updateData.aadharPhotoError = "Upload Failed"
    }

    if (dlPhoto.status === "fulfilled" && dlPhoto.value) {
      updateData.dlPhoto = dlPhoto.value.url
      updateData.dlPublicPhoto = dlPhoto.value.public_id
    } else {
      updateData.dlPhotoError = "Upload Failed"
    }

    if (customerPhoto.status === "fulfilled" && customerPhoto.value) {
      updateData.customerPhoto = customerPhoto.value.url
      updateData.customerPublicPhoto = customerPhoto.value.public_id
    } else {
      updateData.customerPhotoError = "Upload Failed"
    }

    const hasErrors =
      updateData.aadharPhotoError ||
      updateData.dlPhotoError ||
      updateData.customerPhotoError
    if (hasErrors) {
      updateData.status = "partial_failure"
    }

    await Ride.findByIdAndUpdate(rideID, updateData)
    console.log(`Background processing completed for ride ${rideID}`)
  } catch (error) {
    console.error(`Background processing failed for ride ${rideID}:`, error)

    await Ride.findByIdAndUpdate(rideID, {
      status: "failed",
      error: error.message,
      updatedAt: new Date(),
    }).catch(console.error)
  }
}
