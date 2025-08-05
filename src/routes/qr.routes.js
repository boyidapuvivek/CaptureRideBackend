import { Router } from "express"
import { upload } from "../middlewares/multer.middleware.js"
import verifyJwt from "../middlewares/auth.middleware.js"
import { addQr, deleteQr, getQr } from "../controllers/qr.controller.js"

const router = Router()

router.route("/addQR").post(
  verifyJwt,
  upload.fields([
    {
      name: "qrPhoto",
      maxCount: 1,
    },
  ]),
  addQr
)

router.route("/getQR").get(verifyJwt, getQr)
router.route("/deleteQR").delete(verifyJwt, deleteQr)

export default router
