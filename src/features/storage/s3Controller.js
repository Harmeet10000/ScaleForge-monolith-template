import { httpError } from '../../utils/httpError.js';
import {
  validateUploadUrl,
  validateDeleteObject,
  validateCopyObject,
  validateObjectPath,
  validateListObjects,
  validateBatchUploadUrls,
  validateInitiateMultipart,
  validateGenerateMultipartParts,
  validateCompleteMultipart,
  validateAbortMultipart,
  validateListMultipartParts
} from './s3Validation.js';
import {
  getUploadS3URL,
  deleteS3Object,
  listS3Objects,
  copyS3Object,
  checkS3ObjectExists,
  getS3ObjectMetadata,
  generatePresignedUploadUrls,
  createMultipartUpload,
  generateMultipartPresignedUrls,
  completeMultipartUpload,
  abortMultipartUpload,
  listMultipartUploadParts
} from './s3Service.js';
import asyncHandler from 'express-async-handler';
import { httpResponse } from '../../utils/httpResponse.js';
import { validateJoiSchema } from '../../helpers/generalHelper.js';

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

export const generateBatchUploadUrls = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateBatchUploadUrls, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const result = await generatePresignedUploadUrls(value.files, {
    destination: value.destination,
    expiresIn: value.expiresIn
  });
  httpResponse(req, res, 200, 'Batch upload URLs generated', { uploads: result });
});

export const initiateMultipart = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateInitiateMultipart, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const result = await createMultipartUpload(
    value.filename,
    value.fileSize,
    value.contentType,
    value.destination
  );
  httpResponse(req, res, 200, 'Multipart upload initiated', result);
});

export const generateMultipartParts = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateGenerateMultipartParts, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const result = await generateMultipartPresignedUrls({
    filename: value.filename,
    contentType: value.contentType,
    fileSize: value.fileSize,
    destination: value.destination,
    partSize: value.partSize,
    expiresIn: value.expiresIn
  });
  httpResponse(req, res, 200, 'Multipart presigned URLs generated', result);
});

export const completeMultipart = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateCompleteMultipart, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const result = await completeMultipartUpload(value.key, value.uploadId, value.parts);
  httpResponse(req, res, 200, 'Multipart upload completed', result);
});

export const abortMultipart = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateAbortMultipart, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const result = await abortMultipartUpload(value.key, value.uploadId);
  httpResponse(req, res, 200, 'Multipart upload aborted', result);
});

export const listMultipartPartsController = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateListMultipartParts, req.query);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const result = await listMultipartUploadParts(value.key, value.uploadId);
  httpResponse(req, res, 200, 'Multipart upload parts listed', result);
});
