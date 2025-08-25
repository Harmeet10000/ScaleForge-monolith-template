import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  HeadObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import asyncHandler from 'express-async-handler';
import { httpError } from '../utils/httpError.js';
import { httpResponse } from '../utils/httpResponse.js';
import { logger } from '../utils/logger.js';

const s3Client = new S3Client({
  region: process.env.BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY
  }
});

export const getS3URL = asyncHandler(async (fileName) => {
  const getObjectParams = {
    Bucket: process.env.BUCKET_NAME,
    Key: `material/${fileName}`
  };

  const signedUrl = await getSignedUrl(s3Client, new GetObjectCommand(getObjectParams));
  logger.debug('Generated Signed URL for file', { meta: { fileName } });
  return signedUrl;
});

export const getUploadS3URL = asyncHandler(async (req, res, next) => {
  const { filename, contentType, destination } = req.body;

  if (!filename || !contentType) {
    return httpError(next, new Error('Filename and ContentType are required'), req, 400);
  }

  const path = `${destination}/${Date.now()}-${filename}`;

  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: path,
    ContentType: contentType
  };

  const signedUrl = await getSignedUrl(
    s3Client,
    new PutObjectCommand(params),
    { expiresIn: 60 * 15 } // URL valid for 15 minutes
  );

  httpResponse(req, res, 200, 'Upload URL generated successfully', { signedUrl, path });
});

export const deleteS3Object = asyncHandler(async (req, res, next) => {
  const { path } = req.body;

  if (!path) {
    return httpError(next, new Error('Object path is required'), req, 400);
  }

  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: path
  };

  await s3Client.send(new DeleteObjectCommand(params));
  logger.debug('Deleted object from S3', { meta: { path } });

  httpResponse(req, res, 200, 'Object deleted successfully');
});

export const listS3Objects = asyncHandler(async (req, res) => {
  const { prefix = '', maxKeys = 1000 } = req.query;

  const params = {
    Bucket: process.env.BUCKET_NAME,
    Prefix: prefix,
    MaxKeys: parseInt(maxKeys, 10)
  };

  const { Contents, IsTruncated, NextContinuationToken } = await s3Client.send(
    new ListObjectsV2Command(params)
  );

  logger.debug('Listed objects from S3', { meta: { prefix, count: Contents.length } });

  httpResponse(req, res, 200, 'Objects listed successfully', {
    objects: Contents,
    isTruncated: IsTruncated,
    nextContinuationToken: NextContinuationToken
  });
});

export const copyS3Object = asyncHandler(async (req, res, next) => {
  const { sourcePath, destinationPath } = req.body;

  if (!sourcePath || !destinationPath) {
    return httpError(next, new Error('Source and destination paths are required'), req, 400);
  }

  const params = {
    Bucket: process.env.BUCKET_NAME,
    CopySource: `${process.env.BUCKET_NAME}/${sourcePath}`,
    Key: destinationPath
  };

  await s3Client.send(new CopyObjectCommand(params));
  logger.debug('Copied object in S3', { meta: { sourcePath, destinationPath } });

  httpResponse(req, res, 200, 'Object copied successfully', { path: destinationPath });
});

export const checkS3ObjectExists = asyncHandler(async (req, res, next) => {
  const { path } = req.query;

  if (!path) {
    return httpError(next, new Error('Object path is required'), req, 400);
  }

  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: path
  };

  try {
    await s3Client.send(new HeadObjectCommand(params));
    logger.debug('Object exists in S3', { meta: { path } });

    httpResponse(req, res, 200, 'Object existence checked', { exists: true });
  } catch (error) {
    if (error.name === 'NotFound') {
      httpResponse(req, res, 200, 'Object existence checked', { exists: false });
    } else {
      throw error;
    }
  }
});

export const getS3ObjectMetadata = asyncHandler(async (req, res, next) => {
  const { path } = req.query;

  if (!path) {
    return httpError(next, new Error('Object path is required'), req, 400);
  }

  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: path
  };

  const response = await s3Client.send(new HeadObjectCommand(params));
  logger.debug('Retrieved object metadata from S3', { meta: { path } });

  httpResponse(req, res, 200, 'Object metadata retrieved', {
    metadata: {
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      lastModified: response.LastModified,
      eTag: response.ETag,
      ...response.Metadata
    }
  });
});
