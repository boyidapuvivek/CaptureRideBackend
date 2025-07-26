import { Router } from "express";
import { addRide, getRides } from "../controllers/ride.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import verifyJwt from "../middlewares/auth.middleware.js";

const router = Router();

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
);

router.route("/getRides").get(verifyJwt, getRides);

export default router;
// const express = require("express");
// const Ride = require("../models/Ride.js");

// const rideRoutes = express.Router();

// //to post new rides
// rideRoutes.post("/", async (req, res) => {
//   try {
//     const newRide = new Ride(req.body);
//     await newRide.save();
//     res.status(201).json({ message: "Ride added successfully", newRide });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// //to get available rides
// rideRoutes.get("/", async (req, res) => {
//   try {
//     const rides = await Ride.find();
//     res.json(rides);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// module.exports = rideRoutes;
