import { Bikes } from "../models/bike.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponce } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

// Add Bike
const addBike = asyncHandler(async (req, res) => {
  const { bikeNumber, bikeName } = req?.body
  const userId = req?.user?._id

  if (!bikeNumber || !bikeName) {
    throw new ApiError(400, "Bike number and name is required")
  }

  if (!userId) {
    throw new ApiError(401, "Unauthorized access")
  }

  const bike = await Bikes.create({
    userId,
    bikeNumber,
    bikeName,
  })

  if (!bike) {
    throw new ApiError(500, "Something went wrong while adding bike")
  }

  res
    .status(201)
    .json(new ApiResponce(201, { bike }, "Bike successfully added"))
})

// Get all Bikes of logged-in user
const getBikes = asyncHandler(async (req, res) => {
  const userId = req?.user?._id

  if (!userId) {
    throw new ApiError(401, "Unauthorized access")
  }

  const bikes = await Bikes.find({ userId }).sort({ createdAt: -1 })

  if (!bikes) {
    throw new ApiError(500, "Something went wrong while fetching bikes")
  }

  res
    .status(200)
    .json(new ApiResponce(200, { bikes }, "Fetched user's bikes successfully"))
})

// Delete Bike
const deleteBike = asyncHandler(async (req, res) => {
  const bikeId = req?.query?.id
  const userId = req?.user?._id

  if (!bikeId) {
    throw new ApiError(400, "Bike id is required")
  }

  const bike = await Bikes.findOne({ _id: bikeId, userId })

  if (!bike) {
    throw new ApiError(404, "Bike not found or not authorized to delete")
  }

  await bike.deleteOne()

  res.status(200).json(new ApiResponce(200, {}, "Bike deleted successfully"))
})

export { addBike, getBikes, deleteBike }
