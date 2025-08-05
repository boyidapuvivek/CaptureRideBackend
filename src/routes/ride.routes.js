import { Router } from "express"
import {
  addRide,
  deleteRide,
  getRides,
} from "../controllers/ride.controller.js"
import { upload } from "../middlewares/multer.middleware.js"
import verifyJwt from "../middlewares/auth.middleware.js"

const router = Router()

router.route("/addRide").post(
  upload.fields([
    {
      name: "aadharPhoto",
      maxCount: 1,
    },
    {
      name: "dlPhoto",
      maxCount: 1,
    },
    {
      name: "customerPhoto",
      maxCount: 1,
    },
  ]),
  verifyJwt,
  addRide
)

router.route("/getRides").get(verifyJwt, getRides)
router.route("/deleteRide").delete(verifyJwt, deleteRide)

export default router
