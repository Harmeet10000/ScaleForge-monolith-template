import { httpResponse } from '../utils/httpResponse.js'
import { httpError } from '../utils/httpError.js'
import { catchAsync } from '../utils/catchAsync.js'
import {
    validateJoiSchema,
    ValidateRegisterBody,
    ValidateLoginBody,
    ValidateForgotPasswordBody,
    ValidateResetPasswordBody,
    ValidateChangePasswordBody
} from '../validations/authValidation.js'
import * as authService from '../services/authService.js'
import { SUCCESS } from '../constant/responseMessage.js'
import { EApplicationEnvironment } from '../constant/application.js'
import { getDomainFromUrl } from '../helpers/generalHelper.js'

export const register = catchAsync(async (req, res, next) => {
    const { error, value } = validateJoiSchema(ValidateRegisterBody, req.body)
    if (error) {
        return httpError(next, error, req, 422)
    }

    const newUser = await authService.registerUser(value)

    httpResponse(req, res, 201, SUCCESS, { _id: newUser._id })
})

export const confirmation = catchAsync(async (req, res, next) => {
    await authService.confirmAccount(req.params.token, req.query.code, req, next)

    httpResponse(req, res, 200, SUCCESS)
})

export const login = catchAsync(async (req, res, next) => {
    const { error, value } = validateJoiSchema(ValidateLoginBody, req.body)
    if (error) {
        return httpError(next, error, req, 422)
    }

    const { accessToken, refreshToken, domain } = await authService.loginUser(value, req, next)
    // Set cookies
    res.cookie('accessToken', accessToken, {
        path: '/api/v1',
        // domain: domain,
        sameSite: 'strict',
        maxAge: 1000 * 3600,
        httpOnly: true,
        secure: !(process.env.NODE_ENV === EApplicationEnvironment.DEVELOPMENT)
    }).cookie('refreshToken', refreshToken, {
        path: '/api/v1',
        // domain: domain,
        sameSite: 'strict',
        maxAge: 1000 * 3600,
        httpOnly: true,
        secure: !(process.env.NODE_ENV === EApplicationEnvironment.DEVELOPMENT)
    })

    httpResponse(req, res, 200, SUCCESS, {
        accessToken,
        refreshToken
    })
})

export const logout = catchAsync(async (req, res, next) => {
    await authService.logoutUser(req.cookies.refreshToken)

    const DOMAIN = getDomainFromUrl(process.env.SERVER_URL)

    // Cookies clear
    res.clearCookie('accessToken', {
        path: '/api/v1',
        domain: DOMAIN,
        sameSite: 'strict',
        maxAge: 1000 * process.env.ACCESS_TOKEN_EXPIRY,
        httpOnly: true,
        secure: !(process.env.NODE_ENV === EApplicationEnvironment.DEVELOPMENT)
    })

    res.clearCookie('refreshToken', {
        path: '/api/v1',
        domain: DOMAIN,
        sameSite: 'strict',
        maxAge: 1000 * process.env.REFRESH_TOKEN_EXPIRY,
        httpOnly: true,
        secure: !(process.env.NODE_ENV === EApplicationEnvironment.DEVELOPMENT)
    })

    httpResponse(req, res, 200, SUCCESS)
})

export const refreshToken = catchAsync(async (req, res, next) => {
    const { cookies } = req
    const { refreshToken, accessToken } = cookies

    if (req.cookies.accessToken) {
        return httpResponse(req, res, 200, SUCCESS, { accessToken })
    }

    const { newAccessToken, domain } = await authService.refreshUserToken(refreshToken, req, next)

    if (newAccessToken) {
        res.cookie('accessToken', newAccessToken, {
            path: '/api/v1',
            domain: domain,
            sameSite: 'strict',
            maxAge: 1000 * process.env.ACCESS_TOKEN_EXPIRY,
            httpOnly: true,
            secure: !(process.env.NODE_ENV === EApplicationEnvironment.DEVELOPMENT)
        })

        return httpResponse(req, res, 200, SUCCESS, { accessToken: newAccessToken })
    }
})

export const forgotPassword = catchAsync(async (req, res, next) => {
    const { error, value } = validateJoiSchema(ValidateForgotPasswordBody, req.body)
    if (error) {
        return httpError(next, error, req, 422)
    }

    await authService.requestPasswordReset(value.emailAddress, req, next)

    httpResponse(req, res, 200, SUCCESS)
})

export const resetPassword = catchAsync(async (req, res, next) => {
    const { error, value } = validateJoiSchema(ValidateResetPasswordBody, req.body)
    if (error) {
        return httpError(next, error, req, 422)
    }

    await authService.resetUserPassword(req.params.token, value.newPassword, req, next)

    httpResponse(req, res, 200, SUCCESS)
})

export const changePassword = catchAsync(async (req, res, next) => {
    const { error, value } = validateJoiSchema(ValidateChangePasswordBody, req.body)
    if (error) {
        return httpError(next, error, req, 422)
    }

    await authService.changeUserPassword(req.user._id, value.oldPassword, value.newPassword, req, next)

    httpResponse(req, res, 200, SUCCESS)
})

