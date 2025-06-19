"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// Define the User Schema
const UserSchema = new mongoose_1.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    passwordHash: {
        type: String,
        required: true,
    },
    firstName: {
        type: String,
        trim: true,
    },
    lastName: {
        type: String,
        trim: true,
    },
    phoneNumber: {
        type: String,
        unique: true,
        sparse: true, // Allows null values to not violate unique constraint
        trim: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});
// Middleware to hash password before saving
UserSchema.pre('save', async function (next) {
    if (!this.isModified('passwordHash')) {
        next();
    }
    const salt = await bcryptjs_1.default.genSalt(10);
    this.passwordHash = await bcryptjs_1.default.hash(this.passwordHash, salt);
    next();
});
// Method to compare password (Mongoose virtual or instance method)
UserSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcryptjs_1.default.compare(candidatePassword, this.passwordHash);
};
// Update 'updatedAt' timestamp on update operations
UserSchema.pre('findOneAndUpdate', function (next) {
    this.set({ updatedAt: new Date() });
    next();
});
const User = (0, mongoose_1.model)('User', UserSchema);
exports.default = User;
