import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Ride } from "../models/ride.models.js"
import { ApiResponce } from "../utils/ApiResponse.js"
import { processRidePhotosInBackground } from "../utils/processRidePhotosInBackground.js"
import fs from "fs"
import { deleteFromCloudinary } from "../utils/cloudinary.js"

const addRide = asyncHandler(async (req, res) => {
  const { roomNumber, customerName, phoneNumber, vehicleNumber } = req.body

  if (
    [roomNumber, customerName, phoneNumber, vehicleNumber].some(
      (item) => !item || item.trim() === ""
    )
  ) {
    throw new ApiError(400, "All Fields are required")
  }

  const aadharLocalPath = req?.files?.aadharPhoto?.[0]?.path
  const dlLocalPath = req?.files?.dlPhoto?.[0]?.path
  const customerPhotoLocalPath = req?.files?.customerPhoto?.[0]?.path

  if (!aadharLocalPath || !dlLocalPath || !customerPhotoLocalPath) {
    throw new ApiError(400, "All photos (Aadhar, DL, Customer) are required")
  }

  try {
    const ride = await Ride.create({
      userId: req?.user?._id,
      roomNumber,
      customerName,
      phoneNumber,
      vehicleNumber,
      status: "processing",
      aadharPhoto: "pending",
      dlPhoto: "pending",
      customerPhoto: "pending",
      aadharPublicPhoto: "pending",
      dlPublicPhoto: "pending",
      customerPublicPhoto: "pending",
    })

    if (!ride) {
      throw new ApiError(500, "Something went wrong while registering ride")
    }

    res.status(202).json(
      new ApiResponce(
        202,
        {
          rideId: ride._id,
          status: "processing",
          message: "Ride registration initiated. Photos are being processed.",
        },
        "Ride Process Started"
      )
    )

    processRidePhotosInBackground(ride._id, {
      aadharLocalPath,
      dlLocalPath,
      customerPhotoLocalPath,
    })
  } catch (error) {
    // Promise.all([
    //   fs.promises.unlink(aadharLocalPath).catch(() => {}),
    //   fs.promises.unlink(dlLocalPath).catch(() => {}),
    //   fs.promises.unlink(customerPhotoLocalPath).catch(() => {}),
    // ]);
    //insterd of this :

    ;[aadharLocalPath, dlLocalPath, customerPhotoLocalPath].forEach((path) => {
      if (path) fs.promises.unlink(path).catch(() => {})
    })
    throw error
  }
})

const getRides = asyncHandler(async (req, res) => {
  try {
    const userId = req?.user?._id
    const { page = 1, limit = 10 } = req.query
    const skip = (page - 1) * limit

    // Fixed: Use find() instead of findById() for multiple documents
    // Fixed: Add filter condition for counting user's rides
    const [rides, total] = await Promise.all([
      Ride.find({ userId: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Ride.countDocuments({ userId: userId }), // Fixed: Count only user's rides
    ])

    // Modified: Return empty array instead of throwing error
    if (!rides || rides.length === 0) {
      return res.status(200).json(
        new ApiResponce(
          200,
          {
            rides: [],
            pagination: {
              currentPage: parseInt(page),
              totalPages: 0,
              totalRides: 0,
              hasNext: false,
              hasPrev: page > 1,
            },
          },
          "No rides found"
        )
      )
    }

    return res.status(200).json(
      new ApiResponce(
        200,
        {
          rides,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalRides: total,
            hasNext: page * limit < total,
            hasPrev: page > 1,
          },
        },
        "Rides fetched successfully"
      )
    )
  } catch (error) {
    console.error("Error retrieving rides:", error)

    // Fixed: Remove duplicate error handling since asyncHandler should handle this
    // But if you want explicit error handling, make sure not to send response twice
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      })
    }
  }
})

const deleteRide = asyncHandler(async (req, res) => {
  const userId = req?.user?._id
  const rideId = req?.query?.id

  if (!rideId) {
    console.log(req?.query)
    throw new ApiError(400, "rideId is required in query")
  }

  const ride = await Ride.findOne({ _id: rideId, userId })

  if (!ride) {
    throw new ApiError(404, "Ride not found or does not belong to the user")
  }

  try {
    // Delete associated photos from Cloudinary (if they exist)
    const photoPaths = [
      ride.aadharPublicPhoto,
      ride.dlPublicPhoto,
      ride.customerPublicPhoto,
    ].filter(Boolean) // remove undefined/null values

    await Promise.all(photoPaths.map((path) => deleteFromCloudinary(path)))

    await Ride.deleteOne({ _id: rideId, userId })

    return res
      .status(200)
      .json(new ApiResponce(200, null, "Ride deleted successfully"))
  } catch (error) {
    console.error("Error deleting ride:", error)
    throw new ApiError(500, "Failed to delete ride")
  }
})

export { addRide, getRides, deleteRide }
