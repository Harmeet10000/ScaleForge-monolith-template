import express from 'express';
import {
  generateUploadUrl,
  deleteObject,
  listObjects,
  copyObject,
  checkObjectExists,
  getObjectMetadata,
  generateBatchUploadUrls,
  initiateMultipart,
  generateMultipartParts,
  completeMultipart,
  abortMultipart,
  listMultipartPartsController as listMultipartParts
} from './s3Controller.js';
import { protect } from '../auth/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: S3 Storage
 *   description: AWS S3 file storage management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     S3Error:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "S3 operation failed"
 *         error:
 *           type: object
 *     S3Success:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *         data:
 *           type: object
 */
router.use(protect);
/**
 * @swagger
 * /s3/upload-url:
 *   post:
 *     summary: Generate presigned upload URL
 *     description: Generate a presigned URL for uploading files to S3
 *     tags: [S3 Storage]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filename
 *               - contentType
 *             properties:
 *               filename:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *                 example: "document.pdf"
 *               contentType:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "application/pdf"
 *               destination:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "documents"
 *                 default: "uploads"
 *     responses:
 *       200:
 *         description: Upload URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Upload URL generated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     signedUrl:
 *                       type: string
 *                       example: "https://bucket.s3.amazonaws.com/path/file.pdf?X-Amz-Algorithm=..."
 *                     path:
 *                       type: string
 *                       example: "documents/1640995200000-document.pdf"
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/S3Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/S3Error'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/S3Error'
 */
router.post('/upload-url', generateUploadUrl);

/**
 * @swagger
 * /s3/upload-urls/batch:
 *   post:
 *     summary: Generate multiple presigned upload URLs
 *     tags: [S3 Storage]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - files
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [filename, contentType]
 *                   properties:
 *                     filename:
 *                       type: string
 *                     contentType:
 *                       type: string
 *               destination:
 *                 type: string
 *                 default: uploads
 *               expiresIn:
 *                 type: integer
 *                 default: 900
 *     responses:
 *       200:
 *         description: Batch upload URLs generated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/S3Success'
 */
router.post('/upload-urls/batch', generateBatchUploadUrls);

/**
 * @swagger
 * /s3/multipart/initiate:
 *   post:
 *     summary: Initiate multipart upload
 *     tags: [S3 Storage]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [filename, contentType, fileSize]
 *             properties:
 *               filename:
 *                 type: string
 *               contentType:
 *                 type: string
 *               fileSize:
 *                 type: integer
 *               destination:
 *                 type: string
 *                 default: uploads
 *     responses:
 *       200:
 *         description: Multipart upload initiated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/S3Success'
 */
router.post('/multipart/initiate', initiateMultipart);

/**
 * @swagger
 * /s3/multipart/parts:
 *   post:
 *     summary: Generate presigned URLs for multipart upload parts
 *     tags: [S3 Storage]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [filename, contentType, fileSize]
 *             properties:
 *               filename:
 *                 type: string
 *               contentType:
 *                 type: string
 *               fileSize:
 *                 type: integer
 *               partSize:
 *                 type: integer
 *               expiresIn:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Multipart presigned URLs generated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/S3Success'
 */
router.post('/multipart/parts', generateMultipartParts);

/**
 * @swagger
 * /s3/multipart/complete:
 *   post:
 *     summary: Complete multipart upload
 *     tags: [S3 Storage]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [key, uploadId, parts]
 *             properties:
 *               key:
 *                 type: string
 *               uploadId:
 *                 type: string
 *               parts:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     PartNumber:
 *                       type: integer
 *                     ETag:
 *                       type: string
 *     responses:
 *       200:
 *         description: Multipart upload completed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/S3Success'
 */
router.post('/multipart/complete', completeMultipart);

/**
 * @swagger
 * /s3/multipart/abort:
 *   post:
 *     summary: Abort multipart upload
 *     tags: [S3 Storage]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [key, uploadId]
 *             properties:
 *               key:
 *                 type: string
 *               uploadId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Multipart upload aborted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/S3Success'
 */
router.post('/multipart/abort', abortMultipart);

/**
 * @swagger
 * /s3/multipart/parts:
 *   get:
 *     summary: List parts of an in-progress multipart upload
 *     tags: [S3 Storage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: uploadId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Multipart upload parts listed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/S3Success'
 */
router.get('/multipart/parts', listMultipartParts);

/**
 * @swagger
 * /s3/objects:
 *   delete:
 *     summary: Delete S3 object
 *     description: Delete a file from S3 bucket
 *     tags: [S3 Storage]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - path
 *             properties:
 *               path:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 500
 *                 example: "documents/1640995200000-document.pdf"
 *     responses:
 *       200:
 *         description: Object deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/S3Success'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/S3Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/S3Error'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/S3Error'
 */
router.delete('/objects', deleteObject);

/**
 * @swagger
 * /s3/objects:
 *   get:
 *     summary: List S3 objects
 *     description: List objects in S3 bucket with optional prefix filtering
 *     tags: [S3 Storage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: prefix
 *         schema:
 *           type: string
 *           maxLength: 200
 *         description: Filter objects by prefix
 *         example: "documents/"
 *       - in: query
 *         name: maxKeys
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 1000
 *         description: Maximum number of objects to return
 *         example: 100
 *     responses:
 *       200:
 *         description: Objects listed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Objects listed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     objects:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           Key:
 *                             type: string
 *                           Size:
 *                             type: integer
 *                           LastModified:
 *                             type: string
 *                             format: date-time
 *                     isTruncated:
 *                       type: boolean
 *                     nextContinuationToken:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/S3Error'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/S3Error'
 */
router.get('/objects', listObjects);

/**
 * @swagger
 * /s3/objects/copy:
 *   post:
 *     summary: Copy S3 object
 *     description: Copy an object within the S3 bucket
 *     tags: [S3 Storage]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sourcePath
 *               - destinationPath
 *             properties:
 *               sourcePath:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 500
 *                 example: "documents/original.pdf"
 *               destinationPath:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 500
 *                 example: "backups/original-copy.pdf"
 *     responses:
 *       200:
 *         description: Object copied successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Object copied successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     path:
 *                       type: string
 *                       example: "backups/original-copy.pdf"
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/S3Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/S3Error'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/S3Error'
 */
router.post('/objects/copy', copyObject);

/**
 * @swagger
 * /s3/objects/exists:
 *   get:
 *     summary: Check if S3 object exists
 *     description: Check if an object exists in the S3 bucket
 *     tags: [S3 Storage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 500
 *         description: Path of the object to check
 *         example: "documents/file.pdf"
 *     responses:
 *       200:
 *         description: Object existence checked
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Object existence checked"
 *                 data:
 *                   type: object
 *                   properties:
 *                     exists:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/S3Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/S3Error'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/S3Error'
 */
router.get('/objects/exists', checkObjectExists);

/**
 * @swagger
 * /s3/objects/metadata:
 *   get:
 *     summary: Get S3 object metadata
 *     description: Retrieve metadata information for an S3 object
 *     tags: [S3 Storage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 500
 *         description: Path of the object
 *         example: "documents/file.pdf"
 *     responses:
 *       200:
 *         description: Object metadata retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Object metadata retrieved"
 *                 data:
 *                   type: object
 *                   properties:
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         contentType:
 *                           type: string
 *                           example: "application/pdf"
 *                         contentLength:
 *                           type: integer
 *                           example: 1024000
 *                         lastModified:
 *                           type: string
 *                           format: date-time
 *                         eTag:
 *                           type: string
 *                           example: "\"d41d8cd98f00b204e9800998ecf8427e\""
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/S3Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/S3Error'
 *       404:
 *         description: Object not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/S3Error'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/S3Error'
 */
router.get('/objects/metadata', getObjectMetadata);

export default router;
