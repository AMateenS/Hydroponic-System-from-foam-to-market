const nodemailer = require("nodemailer");

let transporter;
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  }
  return transporter;
};

// Throws if sending fails. Use for emails the user is waiting for (OTP, reset code)
const sendMail = ({ to, subject, text, html, replyTo }) =>
  getTransporter().sendMail({
    from: `"Agro-IntelliSense" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
    replyTo,
  });

// Never throws. Use for notifications (order emails) so a mail problem can't break an order
const safeSend = (opts) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("Email is not configured, skipped:", opts.subject);
    return Promise.resolve();
  }
  return sendMail(opts).catch((err) => console.error("Email failed:", opts.subject, "-", err.message));
};

module.exports = { sendMail, safeSend };
