const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const nodemailer = require("nodemailer");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const getEmailPassword = () =>
  process.env.EMAIL_PASSWORD ||
  process.env.EMAIL_PASS ||
  process.env.EMAIL_APP_PASSWORD;

const getEmailPort = () => {
  const parsedPort = Number(process.env.EMAIL_PORT);
  return Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 587;
};

const getEmailHost = () => process.env.EMAIL_HOST || "smtp.gmail.com";

const getEmailFrom = () =>
  process.env.EMAIL_FROM || `"Ritika Agro Center" <${process.env.EMAIL_USER}>`;

const isEmailConfigured = () =>
  Boolean(process.env.EMAIL_USER && getEmailPassword());

const createTransporter = () =>
  nodemailer.createTransport({
    host: getEmailHost(),
    port: getEmailPort(),
    secure: getEmailPort() === 465,
    requireTLS: getEmailPort() !== 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: getEmailPassword(),
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });

const sendMailWithTimeout = async (mailOptions, timeoutMs = 12000) => {
  const transporter = createTransporter();
  let timeoutHandle;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error("Email send timed out")),
      timeoutMs
    );
  });

  try {
    return await Promise.race([transporter.sendMail(mailOptions), timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle);
  }
};

// TEST ROUTE
router.get("/test", (req, res) => {
  res.send("Auth API Working!");
});

// REGISTER API
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Simple check
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    // Check existing
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already exists" });

    // Create user
    const user = await User.create(req.body);

    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ message: "User registered", token });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

// LOGIN API
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Validate inputs
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // 2️⃣ Check user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // 3️⃣ Compare hashed password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // 4️⃣ Create token
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // 5️⃣ Send response
    res.json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GOOGLE OAUTH LOGIN / SIGNUP
router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: "Credential is required" });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res
        .status(500)
        .json({ message: "Google OAuth not configured" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload?.email;
    const name = payload?.name || "User";

    if (!email) {
      return res.status(401).json({ message: "Invalid Google token" });
    }

    let user = await User.findOne({ email });

    if (!user) {
      const randomPassword = crypto.randomBytes(24).toString("hex");
      user = await User.create({
        name,
        email,
        password: randomPassword,
        role: "user",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      message: "Google login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("Google Auth Error:", error);
    return res.status(401).json({ message: "Google authentication failed" });
  }
});

// FORGOT PASSWORD - Send Reset Link
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({ message: "If the email exists, a reset link has been sent." });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

    // Save token to user
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Create reset URL (frontend URL)
    const frontendURL = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetURL = `${frontendURL}/reset-password/${resetToken}`;

    // Email content
    const mailOptions = {
      from: getEmailFrom(),
      to: user.email,
      subject: "🔐 Password Reset Request - Ritika Agro Center",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);">
          <div style="background: white; border-radius: 10px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #16a34a; margin: 0;">🌾 Ritika Agro Center</h1>
              <p style="color: #666; font-size: 14px;">Password Reset Request</p>
            </div>
            
            <hr style="border: none; border-top: 2px solid #e5e7eb; margin: 20px 0;">
            
            <p style="color: #333; font-size: 16px;">Hello <strong>${user.name}</strong>,</p>
            
            <p style="color: #555;">We received a request to reset your password. Click the button below to create a new password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetURL}" style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 15px rgba(22, 163, 74, 0.4);">
                🔑 Reset Password
              </a>
            </div>
            
            <p style="color: #888; font-size: 12px;">Or copy and paste this link in your browser:</p>
            <p style="background: #f3f4f6; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px; color: #666;">${resetURL}</p>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                ⚠️ <strong>Important:</strong> This link will expire in 1 hour. If you didn't request this, please ignore this email.
              </p>
            </div>
            
            <hr style="border: none; border-top: 2px solid #e5e7eb; margin: 20px 0;">
            
            <p style="color: #888; font-size: 12px; text-align: center;">
              © ${new Date().getFullYear()} Ritika Agro Center<br>
              Thittuparai, Tamil Nadu – 638701<br>
              📞 +91 95781 68616
            </p>
          </div>
        </div>
      `,
    };

    // Do not fail the endpoint if SMTP credentials are missing in deployment.
    if (!isEmailConfigured()) {
      console.error(
        "Forgot Password: EMAIL_USER/EMAIL_PASSWORD is not configured."
      );
      if (process.env.NODE_ENV !== "production") {
        console.log(`[DEV] Password reset link for ${user.email}: ${resetURL}`);
      }
      return res.json({
        message: "If the email exists, a reset link has been sent.",
      });
    }

    // Respond immediately so UI never waits on SMTP provider/network latency.
    res.json({ message: "If the email exists, a reset link has been sent." });

    sendMailWithTimeout(mailOptions).catch((mailError) => {
      console.error("Forgot Password Email Error:", mailError);
      if (process.env.NODE_ENV !== "production") {
        console.log(`[DEV] Password reset link for ${user.email}: ${resetURL}`);
      }
    });

  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ message: "Failed to send reset email. Please try again." });
  }
});

// RESET PASSWORD - Verify Token & Update Password
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "New password is required" });
    }

    // Hash the token to compare with stored hash
    const resetTokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Send confirmation email when SMTP is configured.
    if (isEmailConfigured()) {
      const confirmMailOptions = {
        from: getEmailFrom(),
        to: user.email,
        subject: "✅ Password Changed Successfully - Ritika Agro Center",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); border-radius: 10px; padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">✅ Password Changed!</h1>
            </div>
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <p style="color: #333; font-size: 16px;">Hello <strong>${user.name}</strong>,</p>
              <p style="color: #555;">Your password has been successfully changed. You can now login with your new password.</p>
              <p style="color: #888; font-size: 12px;">If you did not make this change, please contact us immediately at <a href="mailto:ritikaagrocenter2024@gmail.com">ritikaagrocenter2024@gmail.com</a></p>
            </div>
          </div>
        `,
      };

      try {
        await sendMailWithTimeout(confirmMailOptions);
      } catch (mailError) {
        console.error("Reset Password Confirmation Email Error:", mailError);
      }
    }

    res.json({ message: "Password reset successful! You can now login." });

  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ message: "Failed to reset password. Please try again." });
  }
});


module.exports = router;
