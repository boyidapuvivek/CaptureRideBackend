import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { Ride } from "../models/ride.models.js";
import { ApiResponce } from "../utils/ApiResponse.js";

const addRide = asyncHandler(async (req, res) => {
  //take the data from body {room no,name etc..}
  //data check => no throw err
  //data upload to data base
  //return res

  const { roomNumber, customerName, phoneNumber, vehicleNumber } = req.body;

  if (
    [roomNumber, customerName, phoneNumber, vehicleNumber].some((item) => {
      item?.trim() === " ";
    })
  ) {
    throw new ApiError(400, "All Fields are required");
  }

  console.log("😊", req.body);

  const aadharLocalPath = req?.files?.aadharPhoto[0]?.path;
  const dlLocalPath = req?.files?.dlPhoto[0]?.path;
  const customerPhotoLocalPath = req?.files?.customerPhoto[0]?.path;

  if (!aadharLocalPath) {
    throw new ApiError(400, "Aadhar photo is required");
  }

  if (!dlLocalPath) {
    throw new ApiError(400, "Driving License photo is required");
  }

  if (!customerPhotoLocalPath) {
    throw new ApiError(400, "Customer photo is required");
  }

  const aadharPhoto = await uploadToCloudinary(aadharLocalPath);
  const dlPhoto = await uploadToCloudinary(dlLocalPath);
  const customerPhoto = await uploadToCloudinary(customerPhotoLocalPath);

  if (!aadharPhoto) {
    throw new ApiError(500, "Aadhar photo not getting uploaded");
  }

  if (!dlPhoto) {
    throw new ApiError(500, "DL photo not getting uploaded");
  }

  if (!customerPhoto) {
    throw new ApiError(500, "Customer photo not getting uploaded");
  }

  const ride = await Ride.create({
    roomNumber,
    customerName,
    phoneNumber,
    vehicleNumber,
    aadharPhoto: aadharPhoto.url,
    dlPhoto: dlPhoto.url,
    customerPhoto: customerPhoto.url,
  });

  if (!ride) {
    throw new ApiError(500, "Something went wrong while registring ride");
  }

  return res
    .status(200)
    .json(new ApiResponce(200, ride, "Ride sucessfully created"));
});

export { addRide };
