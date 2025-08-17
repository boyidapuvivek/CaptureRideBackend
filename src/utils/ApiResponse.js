import { time } from "console"

class ApiResponce {
  constructor(statusCode, payload, message = "Success") {
    this.statusCode = statusCode

    Object.assign(this, payload)
    this.message = message
    this.success = statusCode < 400
  }
}

export { ApiResponce }
