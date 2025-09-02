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
import { logger } from '../../utils/logger.js';

const s3Client = new S3Client({
  region: process.env.BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY
  }
});

export const getS3URL = asyncHandler(async (fileName, destination) => {
  const getObjectParams = {
    Bucket: process.env.BUCKET_NAME,
    Key: `${destination}/${fileName}`
  };

  const signedUrl = await getSignedUrl(s3Client, new GetObjectCommand(getObjectParams));
  logger.debug('Generated Signed URL for file', { meta: { fileName, destination } });
  return signedUrl;
});

export const getUploadS3URL = async (filename, contentType, destination = 'uploads') => {
  const path = `${destination}/${Date.now()}-${filename}`;

  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: path,
    ContentType: contentType
  };

  const signedUrl = await getSignedUrl(s3Client, new PutObjectCommand(params), {
    expiresIn: 60 * 15
  });

  logger.debug('Generated upload URL', { meta: { filename, path } });
  return { signedUrl, path };
};

export const deleteS3Object = async (path) => {
  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: path
  };

  await s3Client.send(new DeleteObjectCommand(params));
  logger.debug('Deleted object from S3', { meta: { path } });
};

export const listS3Objects = async (prefix = '', maxKeys = 1000) => {
  const params = {
    Bucket: process.env.BUCKET_NAME,
    Prefix: prefix,
    MaxKeys: parseInt(maxKeys, 10)
  };

  const { Contents, IsTruncated, NextContinuationToken } = await s3Client.send(
    new ListObjectsV2Command(params)
  );

  logger.debug('Listed objects from S3', { meta: { prefix, count: Contents?.length || 0 } });

  return {
    objects: Contents,
    isTruncated: IsTruncated,
    nextContinuationToken: NextContinuationToken
  };
};

export const copyS3Object = async (sourcePath, destinationPath) => {
  const params = {
    Bucket: process.env.BUCKET_NAME,
    CopySource: `${process.env.BUCKET_NAME}/${sourcePath}`,
    Key: destinationPath
  };

  await s3Client.send(new CopyObjectCommand(params));
  logger.debug('Copied object in S3', { meta: { sourcePath, destinationPath } });

  return { path: destinationPath };
};

export const checkS3ObjectExists = async (path) => {
  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: path
  };

  try {
    await s3Client.send(new HeadObjectCommand(params));
    logger.debug('Object exists in S3', { meta: { path } });
    return { exists: true };
  } catch (error) {
    if (error.name === 'NotFound') {
      return { exists: false };
    }
    throw error;
  }
};

export const getS3ObjectMetadata = async (path) => {
  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: path
  };

  const response = await s3Client.send(new HeadObjectCommand(params));
  logger.debug('Retrieved object metadata from S3', { meta: { path } });

  return {
    metadata: {
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      lastModified: response.LastModified,
      eTag: response.ETag,
      ...response.Metadata
    }
  };
};
