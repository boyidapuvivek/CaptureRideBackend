import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const ConnectDB = async () => {
  try {
    const res = await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);
    console.log(`\n MongoDB connected DB Host : ${res.connection.host}`);
  } catch (error) {
    console.log("Error connecting the database\n", error);
    process.exitCode(1);
  }
};

export default ConnectDB;
