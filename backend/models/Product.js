const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    name: 
    { 
        type: String, 
        required: true 
    },
    price: 
    { 
        type: Number, 
        required: true 
    },
    unit:
    {
        type: String,
        required: true
    },
    image: 
    { 
        type: String, 
        required: true 
    },
    description: 
    { 
        type: String, 
        required: true 
    },
    stock:
    {
        type: Number,
        default: 0,
        min: 0,
        validate: { validator: Number.isInteger, message: "Stock must be a whole number" }
    }
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);