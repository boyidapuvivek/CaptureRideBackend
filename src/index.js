import "dotenv/config";
import ConnectDB from "./db/index.js";
import { app } from "./app.js";

ConnectDB()
  .then(() => {
    app.listen(process.env.port || 8000, () => {
      console.log(`Server is listning on port ${process.env.port}`);
    });
  })
  .catch((err) => {
    console.log("MONGO DB connection failed : ", err);
  });
