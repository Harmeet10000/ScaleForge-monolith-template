import { httpError } from '../../utils/httpError.js';
import {
  validateUploadUrl,
  validateDeleteObject,
  validateCopyObject,
  validateObjectPath,
  validateListObjects,
  validateJoiSchema
} from './s3Validation.js';
import {
  getUploadS3URL,
  deleteS3Object,
  listS3Objects,
  copyS3Object,
  checkS3ObjectExists,
  getS3ObjectMetadata
} from './s3.js';
import asyncHandler from 'express-async-handler';
import { httpResponse } from '../../utils/httpResponse.js';

export const generateUploadUrl = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateUploadUrl, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }
  const result = await getUploadS3URL(value.filename, value.contentType, value.destination);
  httpResponse(req, res, 200, 'Upload URL generated successfully', result);
});

export const deleteObject = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateDeleteObject, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }
  await deleteS3Object(value.path);
  httpResponse(req, res, 200, 'Object deleted successfully');
});

export const listObjects = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateListObjects, req.query);
  if (error) {
    return httpError(next, error, req, 422);
  }
  const result = await listS3Objects(value.prefix, value.maxKeys);
  httpResponse(req, res, 200, 'Objects listed successfully', result);
});

export const copyObject = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateCopyObject, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }
  const result = await copyS3Object(value.sourcePath, value.destinationPath);
  httpResponse(req, res, 200, 'Object copied successfully', result);
});

export const checkObjectExists = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateObjectPath, req.query);
  if (error) {
    return httpError(next, error, req, 422);
  }
  const result = await checkS3ObjectExists(value.path);
  httpResponse(req, res, 200, 'Object existence checked', result);
});

export const getObjectMetadata = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateObjectPath, req.query);
  if (error) {
    return httpError(next, error, req, 422);
  }
  const result = await getS3ObjectMetadata(value.path);
  httpResponse(req, res, 200, 'Object metadata retrieved', result);
});
