// filepath: /home/harmeet/Desktop/Projects/Production-grade-Auth-template/backend/test/routes/authRoutes.test.js
import { describe, it, assert, mock } from '../utils/testUtils.js';
import express from 'express';
import authRoutes from '../../src/routes/authRoutes.js';
import * as authController from '../../src/controllers/authController.js';
import * as authMiddleware from '../../src/middlewares/authMiddleware.js';

// Mock the controller methods and middleware
Object.keys(authController).forEach((key) => {
  if (typeof authController[key] === 'function') {
    mock.method(authController, key, (req, res, next) => {
      res.status(200).json({ method: key });
    });
  }
});

mock.method(authMiddleware, 'protect', (req, res, next) => {
  req.user = { _id: 'mock-user-id' };
  next();
});

describe('Auth Routes', () => {
  let app;
  let request;

  it('should setup before each test', () => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', authRoutes);
    request = app._router;

    // Verify the router was created
    assert.ok(request);
  });

  it('should have POST /register route', () => {
    const registerRoute = request.stack.find(
      (layer) => layer.route && layer.route.path === '/register' && layer.route.methods.post
    );
    assert.ok(registerRoute);
  });

  it('should have PUT /confirmation/:token route', () => {
    const confirmationRoute = request.stack.find(
      (layer) =>
        layer.route && layer.route.path === '/confirmation/:token' && layer.route.methods.put
    );
    assert.ok(confirmationRoute);
  });

  it('should have POST /login route', () => {
    const loginRoute = request.stack.find(
      (layer) => layer.route && layer.route.path === '/login' && layer.route.methods.post
    );
    assert.ok(loginRoute);
  });

  it('should have PUT /logout route with auth middleware', () => {
    const logoutRoute = request.stack.find(
      (layer) => layer.route && layer.route.path === '/logout' && layer.route.methods.put
    );
    assert.ok(logoutRoute);

    // Check if the protect middleware is applied
    // The first handler should be the protect middleware
    assert.ok(logoutRoute.route.stack.length > 1);
  });

  it('should have POST /refresh-token route', () => {
    const refreshTokenRoute = request.stack.find(
      (layer) => layer.route && layer.route.path === '/refresh-token' && layer.route.methods.post
    );
    assert.ok(refreshTokenRoute);
  });

  it('should have PUT /forgot-password route', () => {
    const forgotPasswordRoute = request.stack.find(
      (layer) => layer.route && layer.route.path === '/forgot-password' && layer.route.methods.put
    );
    assert.ok(forgotPasswordRoute);
  });

  it('should have PUT /reset-password/:token route', () => {
    const resetPasswordRoute = request.stack.find(
      (layer) =>
        layer.route && layer.route.path === '/reset-password/:token' && layer.route.methods.put
    );
    assert.ok(resetPasswordRoute);
  });

  it('should have PUT /change-password route with auth middleware', () => {
    const changePasswordRoute = request.stack.find(
      (layer) => layer.route && layer.route.path === '/change-password' && layer.route.methods.put
    );
    assert.ok(changePasswordRoute);

    // Check if the protect middleware is applied
    assert.ok(changePasswordRoute.route.stack.length > 1);
  });
});
