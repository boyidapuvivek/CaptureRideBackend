import express from "express";
import "dotenv/config";
import ConnectDB from "./db/index.js";

const app = express();

// app.use(cors());
ConnectDB();

// const express = require("express");
// const mongoose = require("mongoose");
// const dotenv = require("dotenv");
// const cors = require("cors");
// const rideRoutes = require("./routes/rideRoutes");

// dotenv.config();
// const app = express();

// // Middleware
// app.use(express.json());
// app.use(cors());
// app.use(express.urlencoded({ extended: true }));

// // MongoDB Connection
// mongoose
//   .connect(process.env.MONGO_URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//   })
//   .then(() => console.log("MongoDB Connected Locally"))
//   .catch((err) => console.log(err));

// // Routes
// app.use("/api/rides", rideRoutes);

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
