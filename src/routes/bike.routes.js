import { Router } from "express"
import verifyJwt from "../middlewares/auth.middleware.js"
import {
  addBike,
  getBikes,
  deleteBike,
} from "../controllers/bike.controller.js"

const router = Router()

// Add Bike
router.route("/addBike").post(verifyJwt, addBike)

// Get all Bikes of logged-in user
router.route("/getBikes").get(verifyJwt, getBikes)

// Delete Bike
router.route("/deleteBike").delete(verifyJwt, deleteBike)

export default router
