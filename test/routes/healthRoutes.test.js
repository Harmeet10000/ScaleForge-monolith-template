// filepath: /home/harmeet/Desktop/Projects/Production-grade-Auth-template/backend/test/routes/healthRoutes.test.js
import { describe, it, assert, mock } from '../utils/testUtils.js';
import express from 'express';
import healthRoutes from '../../src/routes/healthRoutes.js';
import * as healthController from '../../src/controllers/healthController.js';

// Mock the controller methods
mock.method(healthController, 'health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

mock.method(healthController, 'self', (req, res) => {
  res.status(200).json({ app: 'API' });
});

describe('Health Routes', () => {
  let app;
  let request;

  it('should setup before each test', () => {
    app = express();
    app.use('/api/v1/health', healthRoutes);
    request = app._router;

    // Verify the router was created
    assert.ok(request);
  });

  it('should have GET /health route', () => {
    const healthRoute = request.stack.find(
      (layer) => layer.route && layer.route.path === '/health' && layer.route.methods.get
    );
    assert.ok(healthRoute);
  });

  it('should have GET /self route', () => {
    const selfRoute = request.stack.find(
      (layer) => layer.route && layer.route.path === '/self' && layer.route.methods.get
    );
    assert.ok(selfRoute);
  });
});
