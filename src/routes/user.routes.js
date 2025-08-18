import {
  changeCurrentPassword,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateProfileImage,
} from "../controllers/user.controller.js"
import { Router } from "express"
import { upload } from "../middlewares/multer.middleware.js"
import verifyJwt from "../middlewares/auth.middleware.js"

const router = Router()

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
  ]),
  registerUser
)

router.route("/login").post(loginUser)
router.route("/logout").post(verifyJwt, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(changeCurrentPassword)
router.route("/update-profile-image").patch(
  verifyJwt,
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
  ]),
  updateProfileImage
)
export default router
