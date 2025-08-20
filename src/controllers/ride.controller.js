import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Ride } from "../models/ride.models.js"
import { ApiResponce } from "../utils/ApiResponse.js"
import { processRidePhotosInBackground } from "../utils/processRidePhotosInBackground.js"
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

  // For memory storage, files are in buffer format
  const aadharFile = req?.files?.aadharPhoto?.[0]
  const dlFile = req?.files?.dlPhoto?.[0]
  const customerPhotoFile = req?.files?.customerPhoto?.[0]

  if (!aadharFile || !dlFile || !customerPhotoFile) {
    throw new ApiError(400, "All photos (Aadhar, DL, Customer) are required")
  }

  // Validate that files have buffers (memory storage)
  if (!aadharFile.buffer || !dlFile.buffer || !customerPhotoFile.buffer) {
    throw new ApiError(
      400,
      "Invalid file format - files must be uploaded properly"
    )
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

    // Process with file buffers instead of paths
    processRidePhotosInBackground(ride._id, {
      aadharFile,
      dlFile,
      customerPhotoFile,
    })
  } catch (error) {
    // No need to delete files from disk since we're using memory storage
    throw error
  }
})

const getRides = asyncHandler(async (req, res) => {
  try {
    const userId = req?.user?._id
    const { page = 1, limit = 10, search } = req.query
    const skip = (page - 1) * limit

    // Build search query
    let searchQuery = { userId: userId }

    if (search && search.trim()) {
      const searchTerm = search.trim()
      const searchRegex = new RegExp(searchTerm, "i") // Case-insensitive search

      searchQuery.$or = [
        { customerName: searchRegex },
        { roomNumber: searchRegex },
        { phoneNumber: searchRegex },
        { vehicleNumber: searchRegex },
      ]
    }

    const [rides, total] = await Promise.all([
      Ride.find(searchQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Ride.countDocuments(searchQuery),
    ])

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
            searchTerm: search || null,
          },
          search ? `No rides found matching "${search}"` : "No rides found"
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
          searchTerm: search || null,
        },
        search ?
          `Found ${rides.length} rides matching "${search}"`
        : "Rides fetched successfully"
      )
    )
  } catch (error) {
    console.error("Error retrieving rides:", error)

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
    ].filter(Boolean)

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

// Optional: Add a dedicated search endpoint for better performance with large datasets
const searchRides = asyncHandler(async (req, res) => {
  try {
    const userId = req?.user?._id
    const { q: searchTerm, limit = 20 } = req.query

    if (!searchTerm || !searchTerm.trim()) {
      throw new ApiError(400, "Search term is required")
    }

    const searchRegex = new RegExp(searchTerm.trim(), "i")

    const rides = await Ride.find({
      userId: userId,
      $or: [
        { customerName: searchRegex },
        { roomNumber: searchRegex },
        { phoneNumber: searchRegex },
        { vehicleNumber: searchRegex },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean()

    return res.status(200).json(
      new ApiResponce(
        200,
        {
          rides,
          searchTerm,
          totalFound: rides.length,
        },
        `Found ${rides.length} rides matching "${searchTerm}"`
      )
    )
  } catch (error) {
    console.error("Error searching rides:", error)

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: "Search failed",
        error: error.message,
      })
    }
  }
})

export { addRide, getRides, deleteRide, searchRides }
