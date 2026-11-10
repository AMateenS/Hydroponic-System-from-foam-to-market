const Stripe = require("stripe");

let client = null;

// Returns null when STRIPE_SECRET_KEY is not set (card payment is then disabled)
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
};

const currency = () => (process.env.STRIPE_CURRENCY || "pkr").toLowerCase();

const clientUrl = () =>
  (process.env.CLIENT_URL || "http://localhost:3000").split(",")[0].trim().replace(/\/$/, "");

module.exports = { getStripe, currency, clientUrl };
