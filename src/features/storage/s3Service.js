import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  HeadObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListPartsCommand
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

export const generatePresignedUploadUrls = async (
  files = [],
  { destination = 'uploads', expiresIn = 60 * 15 } = {}
) =>
  Promise.all(
    files.map(async ({ filename, contentType }) => {
      const path = `${destination}/${Date.now()}-${filename}`;
      const params = {
        Bucket: process.env.BUCKET_NAME,
        Key: path,
        ContentType: contentType
      };
      const signedUrl = await getSignedUrl(s3Client, new PutObjectCommand(params), { expiresIn });
      logger.debug('Generated presigned upload URL', { meta: { filename, path } });
      return { filename, path, signedUrl };
    })
  );

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

export const checkS3ObjectExists = asyncHandler(async (path) => {
  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: path
  };

  await s3Client.send(new HeadObjectCommand(params));
  logger.debug('Object exists in S3', { meta: { path } });
  return { exists: true };
});

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

// Creates a multipart upload and returns uploadId + key
export const createMultipartUpload = async (
  filename,
  fileSize,
  contentType,
  destination = 'uploads'
) => {
  const key = `${destination}/${Date.now()}-${filename}`;
  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    Metadata: {
      uploadedBy: 'auth-template',
      uploadedAt: new Date().toISOString(),
      fileSize: fileSize ? fileSize.toString() : 'unknown',
      'upload-type': 'multipart'
      // 'part-size': partSize ? partSize.toString() : 'unknown'
    }
  };
  const res = await s3Client.send(new CreateMultipartUploadCommand(params));
  logger.debug('Initiated multipart upload', { meta: { key, uploadId: res.UploadId } });
  return { uploadId: res.UploadId, key };
};

// Generate presigned URLs for each part for a single multipart upload
// fileSize is required to compute number of parts. partSize defaults to 5MB (minimum allowed by S3 for multipart parts except last)
export const generateMultipartPresignedUrls = async ({
  filename,
  contentType,
  fileSize,
  destination = 'uploads',
  partSize = 5 * 1024 * 1024,
  expiresIn = 60 * 60
} = {}) => {
  if (typeof fileSize !== 'number' || fileSize <= 0) {
    throw new TypeError('fileSize (bytes) must be provided and > 0 to generate multipart URLs');
  }

  const { uploadId, key } = await createMultipartUpload(filename, contentType, destination);
  const numParts = Math.max(1, Math.ceil(fileSize / partSize));

  const parts = await Promise.all(
    Array.from({ length: numParts }, (_, idx) => idx + 1).map(async (partNumber) => {
      const url = await getSignedUrl(
        s3Client,
        new UploadPartCommand({
          Bucket: process.env.BUCKET_NAME,
          Key: key,
          UploadId: uploadId,
          PartNumber: partNumber
        }),
        { expiresIn }
      );
      return { PartNumber: partNumber, presignedUrl: url };
    })
  );

  logger.debug('Generated multipart presigned URLs', {
    meta: { key, uploadId, partCount: parts.length, partSize }
  });
  return { uploadId, key, parts, partSize };
};

// Complete multipart upload given parts array [{ PartNumber, ETag }]
export const completeMultipartUpload = async (key, uploadId, parts = []) => {
  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts
    }
  };

  const resp = await s3Client.send(new CompleteMultipartUploadCommand(params));
  logger.debug('Completed multipart upload', { meta: { key, uploadId, location: resp.Location } });
  return resp;
};

// Abort multipart upload
export const abortMultipartUpload = async (key, uploadId) => {
  await s3Client.send(
    new AbortMultipartUploadCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: key,
      UploadId: uploadId
    })
  );
  logger.debug('Aborted multipart upload', { meta: { key, uploadId } });
  return { aborted: true };
};

// List parts of an in-progress multipart upload
export const listMultipartUploadParts = async (key, uploadId) => {
  const resp = await s3Client.send(
    new ListPartsCommand({ Bucket: process.env.BUCKET_NAME, Key: key, UploadId: uploadId })
  );
  logger.debug('Listed multipart upload parts', {
    meta: { key, uploadId, partCount: resp?.Parts?.length ?? 0 }
  });
  return resp;
};
