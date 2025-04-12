import mongoose, { Schema } from 'mongoose';
import { EUserRole } from '../constant/application.js';

const userSchema = new Schema(
    {
        name: {
            type: String,
            minlength: 2,
            maxlength: 72,
            required: true
        },
        emailAddress: {
            type: String,
            unique: true,
            required: true
        },
        phoneNumber: {
            _id: false,
            isoCode: {
                type: String,
                required: true
            },
            countryCode: {
                type: String,
                required: true
            },
            internationalNumber: {
                type: String,
                required: true
            }
        },
        timezone: {
            type: String,
            trim: true,
            required: true
        },
        password: {
            type: String,
            required: true,
            select: false
        },
        role: {
            type: String,
            default: EUserRole.USER,
            enum: EUserRole,
            required: true
        },
        accountConfirmation: {
            _id: false,
            status: {
                type: Boolean,
                default: false,
                required: true
            },
            token: {
                type: String,
                required: true
            },
            code: {
                type: String,
                required: true
            },
            timestamp: {
                type: Date,
                default: null
            }
        },
        passwordReset: {
            _id: false,
            token: {
                type: String,
                default: null
            },
            expiry: {
                type: Number,
                default: null
            },
            lastResetAt: {
                type: Date,
                default: null
            }
        },
        lastLoginAt: {
            type: Date,
            default: null
        },
        consent: {
            type: Boolean,
            required: true
        }
    },
    { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
