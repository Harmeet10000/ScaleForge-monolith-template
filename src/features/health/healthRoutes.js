import express from 'express';
import { health, self } from './healthController.js';

const router = express.Router();

/**
 * @swagger
 * /health/self:
 *   get:
 *     summary: Get server identification
 *     description: Returns basic server information including server ID, container hostname, and timestamp
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 request:
 *                   type: object
 *                   properties:
 *                     ip:
 *                       type: string
 *                       example: "127.0.0.1"
 *                     method:
 *                       type: string
 *                       example: "GET"
 *                     url:
 *                       type: string
 *                       example: "/api/v1/health/self"
 *                     correlationId:
 *                       type: string
 *                       example: "abc123-def456"
 *                 message:
 *                   type: string
 *                   example: "Success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     server:
 *                       type: string
 *                       example: "auth-service-1"
 *                     container:
 *                       type: string
 *                       example: "auth-service-2"
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-01T00:00:00.000Z"
 */
router.get('/self', self);

/**
 * @swagger
 * /health/health:
 *   get:
 *     summary: Comprehensive health check
 *     description: Returns detailed health information including application status, system metrics, and external service checks
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Health check completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 request:
 *                   type: object
 *                   properties:
 *                     ip:
 *                       type: string
 *                       example: "127.0.0.1"
 *                     method:
 *                       type: string
 *                       example: "GET"
 *                     url:
 *                       type: string
 *                       example: "/api/v1/health"
 *                     correlationId:
 *                       type: string
 *                       example: "abc123-def456"
 *                 message:
 *                   type: string
 *                   example: "Success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     application:
 *                       type: object
 *                       properties:
 *                         environment:
 *                           type: string
 *                           example: "development"
 *                         uptime:
 *                           type: string
 *                           example: "123.45 Seconds"
 *                         memoryUsage:
 *                           type: object
 *                           properties:
 *                             heapTotal:
 *                               type: string
 *                               example: "50.25 MB"
 *                             heapUsed:
 *                               type: string
 *                               example: "35.75 MB"
 *                         pid:
 *                           type: integer
 *                           example: 12345
 *                         version:
 *                           type: string
 *                           example: "v22.14.0"
 *                     system:
 *                       type: object
 *                       properties:
 *                         cpuUsage:
 *                           type: array
 *                           items:
 *                             type: number
 *                           example: [0.5, 0.3, 0.2]
 *                         cpuUsagePercent:
 *                           type: string
 *                           example: "25.50 + %"
 *                         totalMemory:
 *                           type: string
 *                           example: "8192.00 MB"
 *                         freeMemory:
 *                           type: string
 *                           example: "4096.00 MB"
 *                         platform:
 *                           type: string
 *                           example: "linux"
 *                         arch:
 *                           type: string
 *                           example: "x64"
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-01T00:00:00.000Z"
 *                     checks:
 *                       type: object
 *                       properties:
 *                         database:
 *                           type: object
 *                           properties:
 *                             status:
 *                               type: string
 *                               enum: ["healthy", "unhealthy"]
 *                               example: "healthy"
 *                             state:
 *                               type: string
 *                               example: "connected"
 *                             responseTime:
 *                               type: number
 *                               example: 1234567890
 *                         redis:
 *                           type: object
 *                           properties:
 *                             status:
 *                               type: string
 *                               enum: ["healthy", "unhealthy"]
 *                               example: "healthy"
 *                             responseTime:
 *                               type: number
 *                               example: 5
 *                             connection:
 *                               type: string
 *                               example: "ready"
 *                         memory:
 *                           type: object
 *                           properties:
 *                             status:
 *                               type: string
 *                               enum: ["healthy", "warning"]
 *                               example: "healthy"
 *                             totalMB:
 *                               type: number
 *                               example: 50
 *                             usedMB:
 *                               type: number
 *                               example: 35
 *                             usagePercent:
 *                               type: number
 *                               example: 70
 *                         disk:
 *                           type: object
 *                           properties:
 *                             status:
 *                               type: string
 *                               enum: ["healthy", "unhealthy"]
 *                               example: "healthy"
 *                             accessible:
 *                               type: boolean
 *                               example: true
 *       500:
 *         description: Health check failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/health', health);

export default router;
