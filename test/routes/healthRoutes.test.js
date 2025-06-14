// filepath: /home/harmeet/Desktop/Projects/Production-grade-Auth-template/backend/test/routes/healthRoutes.test.js
import { describe, it, assert, mock, beforeEach } from 'node:test';

// Import health controller first so we can mock its methods
import * as healthController from '../../src/controllers/healthController.js';

// Create mock functions
const healthMock = mock.fn((req, res) => {
  res.status(200).json({ status: 'ok' });
});

const selfMock = mock.fn((req, res) => {
  res.status(200).json({ app: 'API' });
});

// Mock the controller methods
mock.method(healthController, 'health', healthMock);
mock.method(healthController, 'self', selfMock);

// Now import express and routes
import express from 'express';
import healthRoutes from '../../src/routes/healthRoutes.js';

describe('Health Routes', () => {
  let app;
  let router;

  // Setup before each test
  it('should setup the express app', () => {
    // Setup express app with the routes
    app = express();
    app.use('/api/v1/health', healthRoutes);

    // Get the router from the stack - it's the middleware that was added
    const healthLayer = app._router.stack.find(
      (layer) => layer.name === 'router' && layer.regexp.test('/api/v1/health')
    );

    router = healthLayer.handle;

    // Verify the router was created
    assert.ok(router);
  });

  it('should have GET /health route', () => {
    const healthRoute = router.stack.find(
      (layer) => layer.route && layer.route.path === '/health' && layer.route.methods.get
    );
    assert.ok(healthRoute);
  });

  it('should have GET /self route', () => {
    const selfRoute = router.stack.find(
      (layer) => layer.route && layer.route.path === '/self' && layer.route.methods.get
    );
    assert.ok(selfRoute);
  });
});
