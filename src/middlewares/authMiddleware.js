import { catchAsync } from '../utils/catchAsync.js'
import { httpError } from '../utils/httpError.js'
 import jwt from 'jsonwebtoken'
import { promisify } from 'util'
import { User } from '../models/userModel.js'

export const protect = catchAsync(async (req, res, next) => {
    let token

    // 1) Check if token is in cookies first
    if (req.cookies.jwt) {
        token = req.cookies.jwt
    }

    // 2) If token is not found in cookies, check the Authorization header
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1]
    }

    // 3) If no token is found in either, return an error
    if (!token) {
        return httpError(next, new Error('You are not logged in! Please log in to get access.'), req, 401)
    }

    try {
        // 4) Verification token
        const decoded = await promisify(jwt.verify)(token, process.env.ACCESS_TOKEN_SECRET)
        // console.log('decoded', decoded)
        // 5) Check if user still exists
        const currentUser = await User.findById(decoded.userId)

        if (!currentUser) {
            return httpError(next, new Error('The user belonging to this token no longer exists.'), req, 401)
        }

        // 6) Check if user changed password after the token was issued
        if (currentUser.changedPasswordAfter && currentUser.changedPasswordAfter(decoded.iat)) {
            return httpError(next, new Error('User recently changed password! Please log in again.'), req, 401)
        }

        // Grant access to protected route
        req.user = currentUser
        next()
    } catch (err) {
        httpError(next, err, req, 401)
    }
})

export const restrictTo = (...roles) => {
    return (req, res, next) => {
        // console.log("restrictTo", req.user);
        if (!roles.includes(req.user.role)) {
            return next(new AppError('You do not have permission to perform this action', 403))
        }
        next()
    }
}



