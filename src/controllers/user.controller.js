import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { ApiResponce } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { application } from "express";

const options = {
  httpOnly: true,
  secure: true,
};

const generateAccessRefreshTokens = async (userId) => {
  const user = await User.findOne(userId);
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false }); //this step dosent validate as we are only saving the refreshtoken

  return { accessToken, refreshToken };
};

const registerUser = asyncHandler(async (req, res) => {
  //Logic Steps;

  //get user detils from frontend
  //check that all details are not empty
  //check username or email exists
  //check for images ---- take the avatar image
  //upload that to cloudinary ---- avatar

  //create user obj ---- creats entry in db
  //remove password and refress token field from response
  //check for user creation
  //return res

  const { username, email, password } = req.body;

  if (
    [username, email, password].some((fields) => {
      fields?.trim() === "";
    })
  ) {
    throw new ApiError(400, "All Field are reqiured");
  }

  const userExist = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (userExist) {
    throw new ApiError(409, "Username or the Email already exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is needed");
  }
  const avatar = await uploadToCloudinary(avatarLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar field is required");
  }

  const user = await User.create({
    username: username.toLowerCase(),
    avatar: avatar.url,
    email,
    password,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something when wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponce(201, createdUser, "User registerd successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // req body -> data
  // username or email
  //find the user
  //password check
  //access and referesh token
  //send cookie

  const { email, username, password } = req.body;

  if (!email && !username) {
    throw new ApiError(400, "User with this email or username is required");
  }

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exists");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Password entered not valid");
  }

  const { accessToken, refreshToken } = await generateAccessRefreshTokens(
    user._id
  );

  const loggedUser = await User.findOne(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponce(
        200,
        {
          user: loggedUser,
          refreshToken,
          accessToken,
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: { refreshToken: 1 },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponce(200, {}, "User logged-out"));
};

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incommingRefreshToken =
    req?.cookies.refreshToken || req?.body.refreshToken;

  if (!incommingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incommingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    console.log(user, "\n", incommingRefreshToken);

    if (incommingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is already used or expired");
    }

    const { accessToken, newRefreshToken } = generateAccessRefreshTokens(
      user._id
    );

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponce(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

export { registerUser, loginUser, logoutUser, refreshAccessToken };
