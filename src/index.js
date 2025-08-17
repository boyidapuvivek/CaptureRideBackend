import "dotenv/config"
import ConnectDB from "./db/index.js"
import { app } from "./app.js"

ConnectDB()
  .then(() => {
    app.listen(5000 || process.env.port, () => {
      console.log(`Server is listning on port ${process.env.port}`)
    })
  })
  .catch((err) => {
    console.log("MONGO DB connection failed : ", err)
  })
