import mongoose from "mongoose";

const rideSchema = new mongoose.Schema({
  roomNumber: {
    type: String,
    required: true,
    unique: false,
  },
  customerName: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  vehicleNumber: {
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
  customerPhoto: {
    type: String,
    required: true,
  },
});

export const Ride = mongoose.model("Ride", rideSchema);
