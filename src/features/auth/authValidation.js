import Joi from 'joi';

export const validateGoogleSignup = Joi.object({
  id: Joi.string().required(),
  email: Joi.string().email().required(),
  name: Joi.string().min(2).max(72).required(),
  picture: Joi.string().uri().optional()
});

export const validateGoogleLogin = Joi.object({
  id: Joi.string().required(),
  email: Joi.string().email().required()
});

export const validateRegisterBody = Joi.object({
  name: Joi.string().min(2).max(72).trim().required(),
  emailAddress: Joi.string().email().trim().required(),
  phoneNumber: Joi.string().min(4).max(20).trim().required(),
  password: Joi.string().min(8).max(24).trim().required(),
  consent: Joi.boolean().valid(true).required()
});

export const validateLoginBody = Joi.object({
  emailAddress: Joi.string().email().trim().required(),
  password: Joi.string().min(8).max(24).trim().required()
});

export const validateForgotPasswordBody = Joi.object({
  emailAddress: Joi.string().email().trim().required()
});

export const validateResetPasswordBody = Joi.object({
  newPassword: Joi.string().min(8).max(24).trim().required()
});

export const validateChangePasswordBody = Joi.object({
  oldPassword: Joi.string().min(8).max(24).trim().required(),
  newPassword: Joi.string().min(8).max(24).trim().required(),
  confirmNewPassword: Joi.string().min(8).max(24).trim().valid(Joi.ref('newPassword')).required()
});

export const validateJoiSchema = (schema, value) => {
  const result = schema.validate(value);

  return {
    value: result.value,
    error: result.error
  };
};
