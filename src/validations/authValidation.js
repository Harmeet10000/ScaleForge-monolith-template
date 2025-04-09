import joi from 'joi'

export const ValidateRegisterBody = joi.object({
    name: joi.string().min(2).max(72).trim().required(),
    emailAddress: joi.string().email().trim().required(),
    phoneNumber: joi.string().min(4).max(20).trim().required(),
    password: joi.string().min(8).max(24).trim().required(),
    consent: joi.boolean().valid(true).required()
})

export const ValidateLoginBody = joi.object({
    emailAddress: joi.string().email().trim().required(),
    password: joi.string().min(8).max(24).trim().required()
})

export const ValidateForgotPasswordBody = joi.object({
    emailAddress: joi.string().email().trim().required()
})

export const ValidateResetPasswordBody = joi.object({
    newPassword: joi.string().min(8).max(24).trim().required()
})

export const ValidateChangePasswordBody = joi.object({
    oldPassword: joi.string().min(8).max(24).trim().required(),
    newPassword: joi.string().min(8).max(24).trim().required(),
    confirmNewPassword: joi.string().min(8).max(24).trim().valid(joi.ref('newPassword')).required()
})

export const validateJoiSchema = (schema, value) => {
    const result = schema.validate(value)

    return {
        value: result.value,
        error: result.error
    }
}
