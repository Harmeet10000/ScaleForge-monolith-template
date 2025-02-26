import { promisify } from 'util'
import jwt from 'jsonwebtoken'
import catchAsync from '../Utils/catchAsync.js'
import AppError from '../Utils/appError.js'
import { User } from '../models/userModel.js'
import { Mentor } from '../models/mentorModel.js'
import { oauth2Client } from '../config/auth.js'

export const protect = catchAsync(async (req, res, next) => {
    let token

    // 1) Check if token is in cookies first
    if (req.cookies.jwt) {
        token = req.cookies.jwt
        // console.log("JWT token found in cookies:", token);
    }

    // 2) If token is not found in cookies, check the Authorization header
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1]
        // console.log("JWT token found in Authorization header:", token);
    }

    // 3) If no token is found in either, return an error
    if (!token) {
        return next(new AppError('You are not logged in! Please log in to get access.', 401))
    }

    // 2) Verification token
    // eslint-disable-next-line no-undef
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET)
    // 3) Check if user/mentor still exists
    let currentUser
    if (decoded.role === 'mentor') {
        currentUser = await Mentor.findById(decoded.id)
    } else {
        currentUser = await User.findById(decoded.id)
    }

    // 4) Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next(new AppError('User recently changed password! Please log in again.', 401))
    }

    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = currentUser
    // console.log("protect", req.user);
    next()
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

export const validateAuth = (req, res, next) => {
    // console.log("validateAuth", req.cookies.Gtoken);
    // 1) Check if token is in cookies first
    const Goo = req.cookies.Gtoken

    // 2) If token is not found in cookies, check the Authorization header
    // if (
    //   !token &&
    //   req.headers.Authorization &&
    //   req.headers.Authorization.startsWith("Bearer")
    // ) {
    //   token = req.headers.Authorization.split(" ")[1];
    //   console.log("JWT token found in Authorization header:", token);
    // }
    // console.log("token", Goo);
    try {
        const decoded = jwt.verify(Goo, process.env.JWT_SECRET)
        // console.log("decoded", decoded);

        // Set credentials for Google API
        oauth2Client.setCredentials(decoded.googleTokens)

        next()
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'JWT token has expired' })
        }
        console.error('Authentication error:', error)
        res.status(401).json({ error: 'Authentication required' })
    }
}

// export const refreshTokenMiddleware = async (req, res, next) => {
//   try {
//     // Check if tokens are about to expire
//     if (tokenIsExpired(oauth2Client.credentials)) {
//       const { credentials } = await oauth2Client.refreshAccessToken();

//       // Update stored credentials
//       oauth2Client.setCredentials(credentials);

//       // You might want to save these new credentials
//       // in your database or session
//     }
//     next();
//   } catch (error) {
//     res.status(401).json({ error: "Token refresh failed" });
//   }
// };

