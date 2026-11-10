const usermodel = require("../models/User");
const jwt = require("jsonwebtoken");
const { createRemoteJWKSet, jwtVerify } = require("jose");
const { sendMail } = require("../utils/mailer");

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: SEVEN_DAYS,
  ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
};

const publicUser = (u) => ({ id: u.id, username: u.username, email: u.email, role: u.role });

// Case-insensitive lookup so existing mixed-case emails keep working
const findByEmail = (email) =>
  usermodel.findOne({ email: String(email || "").trim() }).collation({ locale: "en", strength: 2 });

const adminEmails = () =>
  (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

const cleanName = (v) => String(v || "").replace(/\s+/g, " ").trim().slice(0, 50);

/* ---------- Firebase ID token check ----------
 * Firebase signs every ID token with Google's keys. We check the signature, the
 * issuer and the audience (your project id) with Google's public keys, so no
 * service-account file is needed. */
const FIREBASE_JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
let jwks;
const getJwks = () => {
  if (!jwks) jwks = createRemoteJWKSet(new URL(FIREBASE_JWKS_URL));
  return jwks;
};

const verifyFirebaseToken = async (idToken, projectId) => {
  const { payload } = await jwtVerify(idToken, getJwks(), {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
    algorithms: ["RS256"],
  });
  if (!payload.sub) throw new Error("Token has no subject");
  return payload;
};

/* ---------- POST /auth/session ----------
 * The browser signs in with Firebase, then sends us the Firebase ID token.
 * We verify it, find (or create) the matching shop account, and start our own
 * session cookie. Roles, orders and admin protection all keep working as before. */
const session = async (req, res) => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.error("FIREBASE_PROJECT_ID is missing in backend/.env");
    return res
      .status(500)
      .json({ success: false, message: "The server is not configured for login (FIREBASE_PROJECT_ID is missing)." });
  }

  try {
    const { idToken, username } = req.body || {};
    if (typeof idToken !== "string" || !idToken) {
      return res.status(400).json({ success: false, message: "Missing login token" });
    }

    let claims;
    try {
      claims = await verifyFirebaseToken(idToken, projectId);
    } catch (err) {
      return res.status(401).json({ success: false, message: "Invalid or expired login. Please try again." });
    }

    const email = String(claims.email || "").trim();
    if (!email) {
      return res.status(400).json({ success: false, message: "This account has no email address" });
    }
    if (claims.email_verified !== true) {
      return res.status(403).json({
        success: false,
        needsVerification: true,
        message: "Please verify your email before logging in.",
      });
    }

    // 1) already linked  2) old shop account with the same email  3) brand new account
    let user = await usermodel.findOne({ firebaseUid: claims.sub });
    if (!user) {
      user = await findByEmail(email);
      if (user && user.firebaseUid && user.firebaseUid !== claims.sub) {
        return res
          .status(409)
          .json({ success: false, message: "This email is already linked to a different login." });
      }
      if (user) user.firebaseUid = claims.sub;
    }

    if (!user) {
      const name = cleanName(claims.name || username) || email.split("@")[0];
      try {
        user = await usermodel.create({
          username: name,
          email,
          firebaseUid: claims.sub,
          role: "user", // never taken from the request
          isVerified: true,
        });
      } catch (err) {
        if (err.code !== 11000) throw err;
        // two requests raced to create the same account: use the one that won
        user = (await usermodel.findOne({ firebaseUid: claims.sub })) || (await findByEmail(email));
        if (!user) throw err;
      }
    }

    user.isVerified = true;
    if (adminEmails().includes(email.toLowerCase()) && user.role !== "admin") user.role = "admin";
    await user.save();

    const token = jwt.sign(
      { id: user.id, role: user.role, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.cookie("token", token, cookieOptions);
    res.json({ success: true, message: "Logged in", user: publicUser(user) });
  } catch (error) {
    console.error("Error creating session", error);
    res.status(500).json({ success: false, message: "Server error during login" });
  }
};

const me = async (req, res) => {
  res.json({
    success: true,
    user: { id: req.user.id, username: req.user.username, email: req.user.email, role: req.user.role },
  });
};

const logout = (req, res) => {
  const { maxAge, ...clearOptions } = cookieOptions;
  res.clearCookie("token", clearOptions);
  res.json({ success: true, message: "Logged out" });
};

/* ---------------- CONTACT US ---------------- */
const contactUs = async (req, res) => {
  const { name, email, subject, message } = req.body || {};
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }
  try {
    await sendMail({
      replyTo: email, // Gmail rewrites other senders, so reply-to carries the visitor's email
      to: process.env.EMAIL_USER,
      subject: `Contact Form: ${subject}`,
      text: `You have a new message from:\nName: ${name}\nEmail: ${email}\nMessage: ${message}`,
    });
    res.status(200).json({ success: true, message: "Email sent successfully!" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = { session, me, logout, contactUs };
