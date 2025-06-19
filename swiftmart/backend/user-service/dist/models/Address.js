"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
// Define the Address Schema
const AddressSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User', // Reference to the 'User' model
        required: true,
    },
    addressLine1: {
        type: String,
        required: true,
        trim: true,
    },
    addressLine2: {
        type: String,
        trim: true,
    },
    city: {
        type: String,
        required: true,
        trim: true,
    },
    state: {
        type: String,
        required: true,
        trim: true,
    },
    zipCode: {
        type: String,
        required: true,
        trim: true,
    },
    country: {
        type: String,
        default: 'India',
        trim: true,
    },
    latitude: {
        type: Number,
    },
    longitude: {
        type: Number,
    },
    isDefault: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});
// Index for efficient querying by userId and isDefault
AddressSchema.index({ userId: 1, isDefault: 1 });
const Address = (0, mongoose_1.model)('Address', AddressSchema);
exports.default = Address;
