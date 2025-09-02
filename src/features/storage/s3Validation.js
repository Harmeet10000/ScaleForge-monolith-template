import Joi from 'joi';

export const validateUploadUrl = Joi.object({
  filename: Joi.string().min(1).max(255).required(),
  contentType: Joi.string().min(1).max(100).required(),
  destination: Joi.string().min(1).max(100).optional().default('uploads')
});

export const validateDeleteObject = Joi.object({
  path: Joi.string().min(1).max(500).required()
});

export const validateCopyObject = Joi.object({
  sourcePath: Joi.string().min(1).max(500).required(),
  destinationPath: Joi.string().min(1).max(500).required()
});

export const validateObjectPath = Joi.object({
  path: Joi.string().min(1).max(500).required()
});

export const validateListObjects = Joi.object({
  prefix: Joi.string().max(200).optional().default(''),
  maxKeys: Joi.number().integer().min(1).max(1000).optional().default(1000)
});

// Reusable validation function (consistent with existing pattern)
export const validateJoiSchema = (schema, value) => {
  const result = schema.validate(value, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true
  });

  return {
    value: result.value,
    error: result.error
  };
};
