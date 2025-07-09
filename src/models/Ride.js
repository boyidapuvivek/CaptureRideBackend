const mongoose = require("mongoose");

const RideSchema = new mongoose.Schema({
  room: { type: String, required: true },
  name: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  selectBike: { type: String, required: true },
});

const Ride = mongoose.model("Ride", RideSchema);
module.exports = Ride;
