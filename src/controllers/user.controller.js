import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import {
  uploadToCloudinary,
  uploadToCloudinaryFromBuffer,
} from "../utils/cloudinary.js"
import { ApiResponce } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"

const options = {
  httpOnly: true,
  secure: true,
}

const generateAccessRefreshTokens = async (userId) => {
  const user = await User.findOne(userId)
  const accessToken = user.generateAccessToken()
  const refreshToken = user.generateRefreshToken()

  user.refreshToken = refreshToken
  await user.save({ validateBeforeSave: false }) //this step dosent validate as we are only saving the refreshtoken

  return { accessToken, refreshToken }
}

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

  const { username, email, password } = req.body

  if (
    [username, email, password].some((item) => {
      item?.trim() === ""
    })
  ) {
    throw new ApiError(400, "All Field are reqiured")
  }

  const userExist = await User.findOne({
    $or: [{ username }, { email }],
  })

  if (userExist) {
    throw new ApiError(409, "Username or the Email already exists")
  }

  // const avatarLocalPath = req.files?.avatar[0]?.path;

  // if (!avatarLocalPath) {
  //   throw new ApiError(400, "Avatar is needed");
  // }
  // const avatar = await uploadToCloudinary(avatarLocalPath);

  // if (!avatar) {
  //   throw new ApiError(400, "Avatar field is required");
  // }

  const user = await User.create({
    username,
    email,
    // avatar: avatar.url,
    password,
  })

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )

  if (!createdUser) {
    throw new ApiError(500, "Something when wrong while registering the user")
  }

  return res
    .status(201)
    .json(new ApiResponce(201, createdUser, "User registerd successfully"))
})

const loginUser = asyncHandler(async (req, res) => {
  // req body -> data
  // username or email
  //find the user
  //password check
  //access and referesh token
  //send cookie

  const { email, username, password } = req.body

  if (!email && !username) {
    throw new ApiError(400, "User with this email or username is required")
  }

  const user = await User.findOne({
    $or: [{ email }, { username }],
  })

  if (!user) {
    throw new ApiError(404, "User does not exists")
  }

  const isPasswordValid = await user.isPasswordCorrect(password)

  if (!isPasswordValid) {
    throw new ApiError(401, "Password entered not valid")
  }

  const { accessToken, refreshToken } = await generateAccessRefreshTokens(
    user._id
  )

  const loggedUser = await User.findOne(user._id).select(
    "-password -refreshToken"
  )

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponce(
        200,
        {
          userData: loggedUser,
          refreshToken,
          accessToken,
        },
        "User logged in successfully"
      )
    )
})

const logoutUser = asyncHandler(async (req, res) => {
  try {
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $unset: { refreshToken: 1 },
      },
      {
        new: true,
      }
    )

    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponce(200, {}, "User logged-out"))
  } catch (error) {
    console.log("error at logout in user controller", error)
  }
})

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incommingRefreshToken =
    req?.cookies.refreshToken || req?.body.refreshToken

  if (!incommingRefreshToken) {
    throw new ApiError(401, "Unauthorized request")
  }

  try {
    const decodedToken = jwt.verify(
      incommingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )

    const user = await User.findById(decodedToken?._id)

    if (!user) {
      throw new ApiError(401, "Invalid refresh token")
    }

    console.log(user, "\n", incommingRefreshToken)

    if (incommingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is already used or expired")
    }

    const { accessToken, newRefreshToken } = generateAccessRefreshTokens(
      user._id
    )

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
      )
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
  }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req?.body
  console.log(oldPassword, newPassword, req.cookies)

  const user = await User.findOne({ refreshToken: req.cookies?.refreshToken })

  const isPasswordValid = user.isPasswordCorrect(oldPassword)

  if (!isPasswordValid) {
    throw new ApiError(400, "Old Password entered is incorrect")
  }

  user.password = newPassword
  await user.save({ validateBeforeSave: false })

  res
    .status(200)
    .json(new ApiResponce(200, {}, "Successfully changed password"))
})

// Add this to your user.controller.js

const updateProfileImage = asyncHandler(async (req, res) => {
  // Get the uploaded avatar file path

  const avatarLocalPath = req?.files?.avatar?.[0]

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required")
  }

  // Upload to cloudinary
  const avatar = await uploadToCloudinaryFromBuffer(avatarLocalPath?.buffer)

  if (!avatar.status === "fulfilled") {
    throw new ApiError(500, "Failed to upload avatar to cloudinary")
  }

  // Update user's avatar in database
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: avatar.secure_url,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken")

  if (!user) {
    throw new ApiError(404, "User not found")
  }

  return res
    .status(200)
    .json(new ApiResponce(200, { user }, "Profile image updated successfully"))
})

const editProfile = asyncHandler(async (req, res) => {
  const { username, email, newPassword, currentPassword } = req.body

  // Check if at least one field is provided
  if (!username && !email && !newPassword) {
    throw new ApiError(
      400,
      "At least one field (username, email, or password) is required to update"
    )
  }

  // Current password is required for any profile update
  if (!currentPassword) {
    throw new ApiError(400, "Current password is required to update profile")
  }

  // Find the current user
  const user = await User.findById(req.user._id)

  if (!user) {
    throw new ApiError(404, "User not found")
  }

  // Verify current password
  const isCurrentPasswordValid = await user.isPasswordCorrect(currentPassword)

  if (!isCurrentPasswordValid) {
    throw new ApiError(401, "Current password is incorrect")
  }

  // Prepare update object
  const updateFields = {}

  // Check if username is being updated and if it's available
  if (username && username !== user.username) {
    const existingUserWithUsername = await User.findOne({
      username,
      _id: { $ne: user._id },
    })

    if (existingUserWithUsername) {
      throw new ApiError(409, "Username is already taken")
    }

    updateFields.username = username
  }

  // Check if email is being updated and if it's available
  if (email && email !== user.email) {
    const existingUserWithEmail = await User.findOne({
      email,
      _id: { $ne: user._id },
    })

    if (existingUserWithEmail) {
      throw new ApiError(409, "Email is already registered")
    }

    updateFields.email = email
  }

  // If password is being updated, hash it
  if (newPassword) {
    if (newPassword.length < 6) {
      throw new ApiError(400, "New password must be at least 6 characters long")
    }

    // Hash the new password
    const bcrypt = await import("bcrypt")
    updateFields.password = await bcrypt.hash(newPassword, 10)
  }

  // Update user
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updateFields },
    { new: true, runValidators: true }
  ).select("-password -refreshToken")

  if (!updatedUser) {
    throw new ApiError(500, "Failed to update profile")
  }

  // If password was changed, invalidate all refresh tokens for security
  if (newPassword) {
    await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } })

    // Clear cookies and return response indicating re-login is required
    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(
        new ApiResponce(
          200,
          { user: updatedUser, requireReauth: true },
          "Profile updated successfully. Please log in again due to changes made."
        )
      )
  }

  return res
    .status(200)
    .json(
      new ApiResponce(
        200,
        { user: updatedUser },
        "Profile updated successfully"
      )
    )
})

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  updateProfileImage,
  editProfile,
}
