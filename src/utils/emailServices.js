import nodemailer from "nodemailer"

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }

  // Verify connection configuration
  async verifyConnection() {
    try {
      await this.transporter.verify()
      console.log("Email service is ready to send emails")
      return true
    } catch (error) {
      console.error("Email service configuration error:", error)
      return false
    }
  }

  // Send OTP email
  async sendOTPEmail(email, otp, purpose = "email_verification") {
    try {
      const { subject, html } = this.getEmailTemplate(otp, purpose)

      const mailOptions = {
        from: {
          name: process.env.APP_NAME || "Your App",
          address: process.env.SMTP_USER,
        },
        to: email,
        subject: subject,
        html: html,
      }

      const info = await this.transporter.sendMail(mailOptions)
      console.log("OTP email sent successfully:", info.messageId)
      return { success: true, messageId: info.messageId }
    } catch (error) {
      console.error("Error sending OTP email:", error)
      return { success: false, error: error.message }
    }
  }

  // Get email template based on purpose
  getEmailTemplate(otp, purpose) {
    const templates = {
      email_verification: {
        subject: "Verify Your Email Address",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #333; text-align: center; margin-bottom: 30px;">Email Verification</h2>
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Thank you for registering with us! Please use the following OTP to verify your email address:
              </p>
              <div style="background-color: #f0f0f0; padding: 20px; text-align: center; border-radius: 5px; margin: 30px 0;">
                <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 8px;">${otp}</h1>
              </div>
              <p style="color: #666; font-size: 14px; text-align: center;">
                This OTP will expire in 10 minutes for security reasons.
              </p>
              <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
                If you didn't request this verification, please ignore this email.
              </p>
            </div>
          </div>
        `,
      },
      password_reset: {
        subject: "Reset Your Password",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #333; text-align: center; margin-bottom: 30px;">Password Reset</h2>
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                We received a request to reset your password. Please use the following OTP to proceed:
              </p>
              <div style="background-color: #f0f0f0; padding: 20px; text-align: center; border-radius: 5px; margin: 30px 0;">
                <h1 style="color: #dc3545; font-size: 32px; margin: 0; letter-spacing: 8px;">${otp}</h1>
              </div>
              <p style="color: #666; font-size: 14px; text-align: center;">
                This OTP will expire in 10 minutes for security reasons.
              </p>
              <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
                If you didn't request a password reset, please ignore this email and your password will remain unchanged.
              </p>
            </div>
          </div>
        `,
      },
      login_verification: {
        subject: "Login Verification Code",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #333; text-align: center; margin-bottom: 30px;">Login Verification</h2>
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Someone is trying to log in to your account. If this is you, please use the following OTP:
              </p>
              <div style="background-color: #f0f0f0; padding: 20px; text-align: center; border-radius: 5px; margin: 30px 0;">
                <h1 style="color: #28a745; font-size: 32px; margin: 0; letter-spacing: 8px;">${otp}</h1>
              </div>
              <p style="color: #666; font-size: 14px; text-align: center;">
                This OTP will expire in 10 minutes for security reasons.
              </p>
              <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
                If this wasn't you, please secure your account immediately.
              </p>
            </div>
          </div>
        `,
      },
    }

    return templates[purpose] || templates.email_verification
  }

  // Send general email
  async sendEmail(to, subject, html, text = null) {
    try {
      const mailOptions = {
        from: {
          name: process.env.APP_NAME || "Your App",
          address: process.env.SMTP_USER,
        },
        to: to,
        subject: subject,
        html: html,
        text: text,
      }

      const info = await this.transporter.sendMail(mailOptions)
      console.log("Email sent successfully:", info.messageId)
      return { success: true, messageId: info.messageId }
    } catch (error) {
      console.error("Error sending email:", error)
      return { success: false, error: error.message }
    }
  }
}

// Export singleton instance
export const emailService = new EmailService()
