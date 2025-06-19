"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config"); // Import configuration for JWT secret and expiration
const User_1 = __importDefault(require("../models/User")); // Import Mongoose User model
const Address_1 = __importDefault(require("../models/Address")); // Import Mongoose Address model
// Helper function to generate JWT
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
exports.asyncHandler = asyncHandler;
const generateToken = (id, email) => {
    if (!config_1.config.jwtSecret) {
        throw new Error('JWT secret is not defined in configuration.');
    }
    const signOptions = { expiresIn: config_1.config.jwtExpiresIn };
    return jsonwebtoken_1.default.sign({ id, email }, config_1.config.jwtSecret, signOptions);
};
// @desc    Register new user
// @route   POST /api/users/register
// @access  Public
exports.registerUser = (0, exports.asyncHandler)(async (req, res) => {
    const { email, password, firstName, lastName, phoneNumber } = req.body;
    // Basic validation
    if (!email || !password) {
        res.status(400).json({ message: 'Please enter all required fields: email and password.' });
        return;
    }
    // Check if user already exists
    const userExists = await User_1.default.findOne({ email });
    if (userExists) {
        res.status(400).json({ message: 'User with this email already exists.' });
        return;
    }
    try {
        // Create new user (password hashing is done in User model's pre-save hook)
        const newUser = new User_1.default({
            email,
            passwordHash: password,
            firstName,
            lastName,
            phoneNumber,
        });
        const user = await newUser.save();
        // Generate JWT token
        const token = generateToken(user._id.toString(), user.email);
        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user._id.toString(),
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                phoneNumber: user.phoneNumber,
            },
            token: token,
        });
    }
    catch (error) {
        console.error('Error registering user:', error);
        if (error.code === 11000) {
            res.status(400).json({ message: 'A user with this email or phone number already exists.' });
        }
        else {
            res.status(500).json({ message: 'Server error during registration.' });
        }
    }
});
// @desc    Authenticate user & get token
// @route   POST /api/users/login
// @access  Public
exports.loginUser = (0, exports.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ message: 'Please enter all required fields: email and password.' });
        return;
    }
    // Find user by email
    const user = await User_1.default.findOne({ email });
    if (!user) {
        res.status(400).json({ message: 'Invalid credentials.' });
        return;
    }
    if (typeof user.comparePassword !== 'function') {
        res.status(500).json({ message: 'Password comparison method not implemented.' });
        return;
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        res.status(400).json({ message: 'Invalid credentials.' });
        return;
    }
    // Generate JWT token
    const token = generateToken(user._id.toString(), user.email);
    res.status(200).json({
        message: 'Logged in successfully',
        user: {
            id: user._id.toString(),
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber,
        },
        token: token,
    });
});
// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getUserProfile = (0, exports.asyncHandler)(async (req, res) => {
    if (!req.user) {
        res.status(401).json({ message: 'Not authorized, user not found.' });
        return;
    }
    try {
        const user = await User_1.default.findById(req.user.id).select('-passwordHash');
        if (!user) {
            res.status(404).json({ message: 'User not found.' });
            return;
        }
        const addresses = await Address_1.default.find({ userId: user._id });
        res.status(200).json({
            id: user._id.toString(),
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber,
            createdAt: user.createdAt,
            addresses: addresses.map(addr => ({
                id: addr._id.toString(),
                userId: addr.userId.toString(),
                addressLine1: addr.addressLine1,
                addressLine2: addr.addressLine2,
                city: addr.city,
                state: addr.state,
                zipCode: addr.zipCode,
                country: addr.country,
                latitude: addr.latitude,
                longitude: addr.longitude,
                isDefault: addr.isDefault,
            })),
        });
    }
    catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Server error fetching profile.' });
    }
});
// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateUserProfile = (0, exports.asyncHandler)(async (req, res) => {
    if (!req.user) {
        res.status(401).json({ message: 'Not authorized, user not found.' });
        return;
    }
    const { firstName, lastName, phoneNumber } = req.body;
    try {
        const updatedUser = await User_1.default.findByIdAndUpdate(req.user.id, { firstName, lastName, phoneNumber, updatedAt: new Date() }, // Mongoose pre-update hook handles updatedAt too
        { new: true, runValidators: true, select: '-passwordHash' } // Return updated doc, run schema validators, exclude hash
        );
        if (!updatedUser) {
            res.status(404).json({ message: 'User not found.' });
            return;
        }
        res.status(200).json({
            message: 'Profile updated successfully',
            user: {
                id: updatedUser._id.toString(),
                email: updatedUser.email,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                phoneNumber: updatedUser.phoneNumber,
            },
        });
    }
    catch (error) {
        console.error('Error updating user profile:', error);
        if (error.code === 11000) { // MongoDB duplicate key error for phone number
            res.status(400).json({ message: 'Phone number already in use by another user.' });
            return;
        }
        res.status(500).json({ message: 'Server error updating profile.' });
    }
});
// @desc    Add a new address
// @route   POST /api/users/addresses
// @access  Private
exports.addAddress = (0, exports.asyncHandler)(async (req, res) => {
    if (!req.user) {
        res.status(401).json({ message: 'Not authorized, user not found.' });
        return;
    }
    const { addressLine1, addressLine2, city, state, zipCode, country, latitude, longitude, isDefault } = req.body;
    if (!addressLine1 || !city || !state || !zipCode) {
        res.status(400).json({ message: 'Required address fields missing: addressLine1, city, state, zipCode.' });
        return;
    }
    try {
        // If new address is set as default, unset previous default for this user
        if (isDefault) {
            await Address_1.default.updateMany({ userId: req.user.id, isDefault: true }, { $set: { isDefault: false } });
        }
        const newAddress = new Address_1.default({
            userId: req.user.id, // Mongoose will convert string ID to ObjectId
            addressLine1,
            addressLine2,
            city,
            state,
            zipCode,
            country,
            latitude,
            longitude,
            isDefault: isDefault || false, // Ensure it's false if not explicitly true
        });
        const createdAddress = await newAddress.save();
        res.status(201).json({
            message: 'Address added successfully',
            address: {
                id: createdAddress._id.toString(), // Convert ObjectId to string
                userId: createdAddress.userId.toString(),
                addressLine1: createdAddress.addressLine1,
                addressLine2: createdAddress.addressLine2,
                city: createdAddress.city,
                state: createdAddress.state,
                zipCode: createdAddress.zipCode,
                country: createdAddress.country,
                latitude: createdAddress.latitude,
                longitude: createdAddress.longitude,
                isDefault: createdAddress.isDefault,
            },
        });
    }
    catch (error) {
        console.error('Error adding address:', error);
        res.status(500).json({ message: 'Server error adding address.' });
    }
});
// @desc    Update an existing address
// @route   PUT /api/users/addresses/:id
// @access  Private
exports.updateAddress = (0, exports.asyncHandler)(async (req, res) => {
    if (!req.user) {
        res.status(401).json({ message: 'Not authorized, user not found.' });
        return;
    }
    const addressId = req.params.id;
    const { addressLine1, addressLine2, city, state, zipCode, country, latitude, longitude, isDefault } = req.body;
    try {
        // Find the address and ensure it belongs to the authenticated user
        const address = await Address_1.default.findOne({ _id: addressId, userId: req.user.id });
        if (!address) {
            res.status(404).json({ message: 'Address not found or does not belong to user.' });
            return;
        }
        // If updating to default, unset previous default for this user
        if (isDefault === true && !address.isDefault) { // Only if it's explicitly set to true and was not already default
            await Address_1.default.updateMany({ userId: req.user.id, isDefault: true, _id: { $ne: addressId } }, { $set: { isDefault: false } });
        }
        // If setting to false, and it was the only default, handle appropriately (e.g., ensure another becomes default or allow none)
        // For simplicity, we just unset it.
        const updatedAddress = await Address_1.default.findByIdAndUpdate(addressId, {
            addressLine1: addressLine1 !== undefined ? addressLine1 : address.addressLine1,
            addressLine2: addressLine2 !== undefined ? addressLine2 : address.addressLine2,
            city: city !== undefined ? city : address.city,
            state: state !== undefined ? state : address.state,
            zipCode: zipCode !== undefined ? zipCode : address.zipCode,
            country: country !== undefined ? country : address.country,
            latitude: latitude !== undefined ? latitude : address.latitude,
            longitude: longitude !== undefined ? longitude : address.longitude,
            isDefault: isDefault !== undefined ? isDefault : address.isDefault,
        }, { new: true, runValidators: true } // Return the updated document, run schema validators
        );
        if (!updatedAddress) { // Should not happen if 'address' was found
            res.status(500).json({ message: 'Failed to update address.' });
            return;
        }
        res.status(200).json({
            message: 'Address updated successfully',
            address: {
                id: updatedAddress._id.toString(),
                userId: updatedAddress.userId.toString(),
                addressLine1: updatedAddress.addressLine1,
                addressLine2: updatedAddress.addressLine2,
                city: updatedAddress.city,
                state: updatedAddress.state,
                zipCode: updatedAddress.zipCode,
                country: updatedAddress.country,
                latitude: updatedAddress.latitude,
                longitude: updatedAddress.longitude,
                isDefault: updatedAddress.isDefault,
            },
        });
    }
    catch (error) {
        console.error('Error updating address:', error);
        res.status(500).json({ message: 'Server error updating address.' });
    }
});
// @desc    Delete an address
// @route   DELETE /api/users/addresses/:id
// @access  Private
exports.deleteAddress = (0, exports.asyncHandler)(async (req, res) => {
    if (!req.user) {
        res.status(401).json({ message: 'Not authorized, user not found.' });
        return;
    }
    const addressId = req.params.id;
    try {
        // Ensure the address belongs to the authenticated user before deleting
        const result = await Address_1.default.deleteOne({ _id: addressId, userId: req.user.id });
        if (result.deletedCount === 0) {
            res.status(404).json({ message: 'Address not found or does not belong to user.' });
            return;
        }
        res.status(200).json({ message: 'Address deleted successfully', id: addressId });
    }
    catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).json({ message: 'Server error deleting address.' });
    }
});
