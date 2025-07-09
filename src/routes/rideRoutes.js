const express = require("express");
const Ride = require("../models/Ride.js");

const rideRoutes = express.Router();

//to post new rides
rideRoutes.post("/", async (req, res) => {
  try {
    const newRide = new Ride(req.body);
    await newRide.save();
    res.status(201).json({ message: "Ride added successfully", newRide });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//to get available rides
rideRoutes.get("/", async (req, res) => {
  try {
    const rides = await Ride.find();
    res.json(rides);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = rideRoutes;
