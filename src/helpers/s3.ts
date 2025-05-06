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
import config from '../config/dotenvConfig';
import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { httpError } from '../utils/httpError';
import { httpResponse } from '../utils/httpResponse';
import { logger } from '../utils/logger';

interface GetObjectMetadataQuery {
  path?: string;
  [key: string]: any; // Add index signature to satisfy ParsedQs compatibility
}

// Define interfaces for expected request bodies and query parameters
interface UploadUrlRequestBody {
  filename: string;
  contentType: string;
  destination: string;
}

interface DeleteObjectRequestBody {
  path: string;
}

interface ListObjectsQuery {
  prefix?: string;
  maxKeys?: string; // Query params are strings initially
  [key: string]: any; // Add index signature to satisfy ParsedQs compatibility
}

interface CopyObjectRequestBody {
  sourcePath: string;
  destinationPath: string;
}

interface CheckObjectExistsQuery {
  path?: string;
  [key: string]: any; // Add index signature to satisfy ParsedQs compatibility
}

if (!config.BUCKET_REGION || !config.ACCESS_KEY || !config.SECRET_ACCESS_KEY) {
  throw new Error('Missing AWS S3 configuration in environment');
}

// Use non-null assertions to satisfy S3ClientConfig
const s3Client = new S3Client({
  region: config.BUCKET_REGION!,
  credentials: {
    accessKeyId: config.ACCESS_KEY!,
    secretAccessKey: config.SECRET_ACCESS_KEY!
  }
});

const SIGNED_URL_EXPIRES_IN = 60 * 15; // 15 minutes

// Convert getS3URL to plain async helper (not Express handler)
export const getS3URL = async (fileName: string): Promise<string> => {
  const getObjectParams = {
    Bucket: config.BUCKET_NAME,
    Key: `material/${fileName}`
  };

  const signedUrl = await getSignedUrl(s3Client, new GetObjectCommand(getObjectParams));
  logger.debug('Generated Signed URL for file', { meta: { fileName } });
  return signedUrl;
};

export const getUploadS3URL = catchAsync(
  async (
    req: Request<{}, {}, UploadUrlRequestBody>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { filename, contentType, destination } = req.body;

    if (!filename || !contentType) {
      return httpError(next, new Error('Filename and ContentType are required'), req, 400);
    }

    const path = `${destination}/${Date.now()}-${filename}`;

    const params = {
      Bucket: config.BUCKET_NAME,
      Key: path,
      ContentType: contentType
    };

    const signedUrl = await getSignedUrl(s3Client, new PutObjectCommand(params), {
      expiresIn: SIGNED_URL_EXPIRES_IN
    });

    httpResponse(req, res, 200, 'Upload URL generated successfully', { signedUrl, path });
  }
);

export const deleteS3Object = catchAsync(
  async (
    req: Request<{}, {}, DeleteObjectRequestBody>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { path } = req.body;

    if (!path) {
      return httpError(next, new Error('Object path is required'), req, 400);
    }

    const params = {
      Bucket: config.BUCKET_NAME,
      Key: path
    };

    await s3Client.send(new DeleteObjectCommand(params));
    logger.debug('Deleted object from S3', { meta: { path } });

    httpResponse(req, res, 200, 'Object deleted successfully');
  }
);

export const listS3Objects = catchAsync(
  async (req: Request<{}, {}, {}, ListObjectsQuery>, res: Response): Promise<void> => {
    const { prefix = '', maxKeys: maxKeysStr = '1000' } = req.query;
    const maxKeys = parseInt(maxKeysStr, 10) || 1000; // Ensure it's a number, default 1000

    const params = {
      Bucket: config.BUCKET_NAME,
      Prefix: prefix,
      MaxKeys: maxKeys
    };

    const { Contents, IsTruncated, NextContinuationToken } = await s3Client.send(
      new ListObjectsV2Command(params)
    );
    const objectCount = Contents ? Contents.length : 0;
    logger.debug('Listed objects from S3', {
      meta: { prefix, objectCount, count: Contents?.length ?? 0 }
    });

    httpResponse(req, res, 200, 'Objects listed successfully', {
      objects: Contents,
      isTruncated: IsTruncated,
      nextContinuationToken: NextContinuationToken
    });
  }
);

export const copyS3Object = catchAsync(
  async (
    req: Request<{}, {}, CopyObjectRequestBody>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { sourcePath, destinationPath } = req.body;

    if (!sourcePath || !destinationPath) {
      return httpError(next, new Error('Source and destination paths are required'), req, 400);
    }

    const params = {
      Bucket: config.BUCKET_NAME,
      CopySource: `${config.BUCKET_NAME}/${sourcePath}`,
      Key: destinationPath
    };

    await s3Client.send(new CopyObjectCommand(params));
    logger.debug('Copied object in S3', { meta: { sourcePath, destinationPath } });

    httpResponse(req, res, 200, 'Object copied successfully', { path: destinationPath });
  }
);

export const checkS3ObjectExists = catchAsync(
  async (
    req: Request<{}, {}, {}, CheckObjectExistsQuery>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { path } = req.query;

    if (!path) {
      return httpError(next, new Error('Object path is required'), req, 400);
    }

    const params = {
      Bucket: config.BUCKET_NAME,
      Key: path
    };

    try {
      await s3Client.send(new HeadObjectCommand(params));
      logger.debug('Object exists in S3', { meta: { path } });

      httpResponse(req, res, 200, 'Object existence checked', { exists: true });
    } catch (error) {
      if (error instanceof Error && (error.name === 'NotFound' || error.name === 'NoSuchKey')) {
        httpResponse(req, res, 200, 'Object existence checked', { exists: false });
      } else {
        throw error;
      }
    }
  }
);

export const getS3ObjectMetadata = catchAsync(
  async (
    req: Request<{}, {}, {}, GetObjectMetadataQuery>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { path } = req.query;

    if (!path) {
      return httpError(next, new Error('Object path is required'), req, 400);
    }

    const params = {
      Bucket: config.BUCKET_NAME,
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
        ...(response.Metadata || {}) // Ensure Metadata is an object before spreading
      }
    });
  }
);
