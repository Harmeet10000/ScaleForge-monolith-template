import { User } from '../models/userModel.js'

export const registerUser = async (payload) => {
    return await User.create(payload)
}

export const findUserById = async (id, select = '') => {
    return await User.findById(id).select(select)
}

export const findByIdWithPassword = async (id) => {
    return await User.findById(id).select('+password')
}
export const findUserByEmailAddress = async (emailAddress, select = '') => {
    return await User.findOne({
        emailAddress
    }).select(select)
}


export const findUserByConfirmationTokenAndCode = async (token, code) => {
    return await User.findOne({
        'accountConfirmation.token': token,
        'accountConfirmation.code': code
    })
}

export const findByResetToken = async (token) => {
    return await User.findOne({
        'passwordReset.token': token
    })
}

