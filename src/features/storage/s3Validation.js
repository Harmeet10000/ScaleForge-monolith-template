import Joi from 'joi';

export const validateUploadUrl = Joi.object({
  filename: Joi.string().min(1).max(255).required(),
  contentType: Joi.string().min(1).max(100).required(),
  destination: Joi.string().min(1).max(100).required()
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

export const validateBatchUploadUrls = Joi.object({
  files: Joi.array()
    .items(
      Joi.object({
        filename: Joi.string().min(1).max(255).required(),
        contentType: Joi.string().min(1).max(100).required()
      })
    )
    .min(1)
    .required(),
  destination: Joi.string().min(1).max(100).optional().default('uploads'),
  expiresIn: Joi.number()
    .integer()
    .min(60)
    .max(60 * 60 * 24)
    .optional()
    .default(60 * 15)
});

export const validateInitiateMultipart = Joi.object({
  filename: Joi.string().min(1).max(255).required(),
  contentType: Joi.string().min(1).max(100).required(),
  fileSize: Joi.number().integer().min(1).required(),
  destination: Joi.string().min(1).max(100).optional().default('uploads')
});

export const validateGenerateMultipartParts = Joi.object({
  filename: Joi.string().min(1).max(255).required(),
  contentType: Joi.string().min(1).max(100).required(),
  fileSize: Joi.number().integer().min(1).required(),
  destination: Joi.string().min(1).max(100).optional().default('uploads'),
  partSize: Joi.number()
    .integer()
    .min(5 * 1024 * 1024)
    .optional()
    .default(5 * 1024 * 1024),
  expiresIn: Joi.number()
    .integer()
    .min(60)
    .optional()
    .default(60 * 60)
});

export const validateCompleteMultipart = Joi.object({
  key: Joi.string().min(1).max(1000).required(),
  uploadId: Joi.string().min(1).max(200).required(),
  parts: Joi.array()
    .items(
      Joi.object({
        PartNumber: Joi.number().integer().min(1).required(),
        ETag: Joi.string().min(1).required()
      })
    )
    .min(1)
    .required()
});

export const validateAbortMultipart = Joi.object({
  key: Joi.string().min(1).max(1000).required(),
  uploadId: Joi.string().min(1).max(200).required()
});

export const validateListMultipartParts = Joi.object({
  key: Joi.string().min(1).max(1000).required(),
  uploadId: Joi.string().min(1).max(200).required()
});
