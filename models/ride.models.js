const mongoose = require("mongoose");

const rideSchema = new mongoose.Schema({
  room: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  bikeNumber: {
    type: String,
    required: true,
  },
  aadharPhoto: {
    type: String,
    required: true,
  },
  dlPhoto: {
    type: String,
    required: true,
  },
  userPhoto: {
    type: String,
    required: true,
  },
});

const Ride = mongoose.model("Ride", rideSchema);
module.exports = Ride;
