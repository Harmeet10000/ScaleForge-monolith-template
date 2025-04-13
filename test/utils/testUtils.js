import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';

// Mock Express app for testing
export const createMockApp = () => {
  // This function creates a minimal Express app mock
  // that can be used for testing routes without requiring a full server
  const routes = {};
  const middleware = [];

  const app = {
    use: (path, handler) => {
      if (typeof path === 'function') {
        middleware.push(path);
      } else {
        routes[path] = handler;
      }
      return app;
    },
    get: (path, ...handlers) => {
      routes[`GET ${path}`] = handlers;
      return app;
    },
    post: (path, ...handlers) => {
      routes[`POST ${path}`] = handlers;
      return app;
    },
    put: (path, ...handlers) => {
      routes[`PUT ${path}`] = handlers;
      return app;
    },
    delete: (path, ...handlers) => {
      routes[`DELETE ${path}`] = handlers;
      return app;
    },
    routes,
    middleware
  };

  return app;
};

// Mock response object for testing controllers directly
export const createMockResponse = () => {
  const res = {
    status: function (code) {
      this.statusCode = code;
      return this;
    },
    json: function (data) {
      this.body = data;
      return this;
    },
    cookie: function (name, value, options) {
      this.cookies = this.cookies || {};
      this.cookies[name] = { value, options };
      return this;
    },
    clearCookie: function (name, options) {
      this.clearedCookies = this.clearedCookies || {};
      this.clearedCookies[name] = options;
      return this;
    },
    statusCode: 200,
    body: null,
    cookies: {},
    clearedCookies: {}
  };
  return res;
};

// Helper function to mock middleware for testing
export const mockMiddleware =
  (shouldPass = true) =>
  (req, res, next) => {
    if (shouldPass) {
      next();
    } else {
      res.status(401).json({ message: 'Unauthorized' });
    }
  };

// Export test utilities for reuse
export { describe, it, assert, mock, supertest };
