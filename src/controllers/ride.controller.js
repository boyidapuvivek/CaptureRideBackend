import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Ride } from "../models/ride.models.js";
import { ApiResponce } from "../utils/ApiResponse.js";
import { processRidePhotosInBackground } from "../utils/processRidePhotosInBackground.js";
import fs from "fs";
import { User } from "../models/user.models.js";

const addRide = asyncHandler(async (req, res) => {
  const { roomNumber, customerName, phoneNumber, vehicleNumber } = req.body;

  if (
    [roomNumber, customerName, phoneNumber, vehicleNumber].some(
      (item) => !item || item.trim() === ""
    )
  ) {
    throw new ApiError(400, "All Fields are required");
  }

  const aadharLocalPath = req?.files?.aadharPhoto?.[0]?.path;
  const dlLocalPath = req?.files?.dlPhoto?.[0]?.path;
  const customerPhotoLocalPath = req?.files?.customerPhoto?.[0]?.path;

  if (!aadharLocalPath || !dlLocalPath || !customerPhotoLocalPath) {
    throw new ApiError(400, "All photos (Aadhar, DL, Customer) are required");
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
    });

    if (!ride) {
      throw new ApiError(500, "Something went wrong while registering ride");
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
    );

    processRidePhotosInBackground(ride._id, {
      aadharLocalPath,
      dlLocalPath,
      customerPhotoLocalPath,
    });
  } catch (error) {
    // Promise.all([
    //   fs.promises.unlink(aadharLocalPath).catch(() => {}),
    //   fs.promises.unlink(dlLocalPath).catch(() => {}),
    //   fs.promises.unlink(customerPhotoLocalPath).catch(() => {}),
    // ]);
    //insterd of this :

    [aadharLocalPath, dlLocalPath, customerPhotoLocalPath].forEach((path) => {
      if (path) fs.promises.unlink(path).catch(() => {});
    });
    throw error;
  }
});

const getRides = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const [rides, total] = await Promise.all([
      Ride.find({ userId: req?.user?._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Ride.countDocuments({}),
    ]);

    if (!rides || rides.length === 0) {
      throw new ApiError(404, "No rides found");
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
    );
  } catch (error) {
    console.error("Error retrieving rides:", error);
    res.status(500).json({
      error: error.message,
    });
  }
});

export { addRide, getRides };
