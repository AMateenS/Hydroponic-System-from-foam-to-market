const Product = require("../models/Product");

// One-time, safe to run on every start: gives products created before stock tracking
// existed a starting stock so they can still be bought. Edit them in Admin > Website Content.
module.exports = async function migrateStock() {
  const initial = Number(process.env.INITIAL_STOCK_FOR_EXISTING_PRODUCTS ?? 50);
  const result = await Product.updateMany({ stock: { $exists: false } }, { $set: { stock: initial } });
  if (result.modifiedCount) {
    console.log(
      `Stock migration: set stock to ${initial} on ${result.modifiedCount} existing product(s). Adjust in Admin > Website Content.`
    );
  }
  const total = await Product.countDocuments();
  console.log(
    `Products in this database: ${total}` +
      (total === 0 ? "  <-- none found. Check the database name in MONGO_URI, or add products in the admin panel." : "")
  );
};
