// filepath: /home/harmeet/Desktop/Projects/Production-grade-Auth-template/backend/test/validations/authValidation.test.js
import { describe, it, assert } from '../utils/testUtils.js';
import {
  ValidateRegisterBody,
  ValidateLoginBody,
  ValidateForgotPasswordBody,
  ValidateResetPasswordBody,
  ValidateChangePasswordBody,
  validateJoiSchema
} from '../../src/validations/authValidation.js';
import {
  mockUser,
  mockLoginCredentials,
  mockForgotPassword,
  mockResetPassword,
  mockChangePassword,
  mockInvalidUser
} from '../mockData/authMockData.js';

describe('Auth Validation Tests', () => {
  describe('ValidateRegisterBody', () => {
    it('should validate a valid registration body', () => {
      const { error } = validateJoiSchema(ValidateRegisterBody, mockUser);
      assert.equal(error, undefined);
    });

    it('should reject an invalid registration body', () => {
      const { error } = validateJoiSchema(ValidateRegisterBody, mockInvalidUser);
      assert.notEqual(error, undefined);
    });

    it('should reject when required fields are missing', () => {
      const { error } = validateJoiSchema(ValidateRegisterBody, { name: 'Test User' });
      assert.notEqual(error, undefined);
    });
  });

  describe('ValidateLoginBody', () => {
    it('should validate valid login credentials', () => {
      const { error } = validateJoiSchema(ValidateLoginBody, mockLoginCredentials);
      assert.equal(error, undefined);
    });

    it('should reject when email is invalid', () => {
      const { error } = validateJoiSchema(ValidateLoginBody, {
        ...mockLoginCredentials,
        emailAddress: 'invalid-email'
      });
      assert.notEqual(error, undefined);
    });

    it('should reject when password is too short', () => {
      const { error } = validateJoiSchema(ValidateLoginBody, {
        ...mockLoginCredentials,
        password: 'short'
      });
      assert.notEqual(error, undefined);
    });
  });

  describe('ValidateForgotPasswordBody', () => {
    it('should validate a valid forgot password request', () => {
      const { error } = validateJoiSchema(ValidateForgotPasswordBody, mockForgotPassword);
      assert.equal(error, undefined);
    });

    it('should reject when email is invalid', () => {
      const { error } = validateJoiSchema(ValidateForgotPasswordBody, {
        emailAddress: 'invalid-email'
      });
      assert.notEqual(error, undefined);
    });
  });

  describe('ValidateResetPasswordBody', () => {
    it('should validate a valid reset password request', () => {
      const { error } = validateJoiSchema(ValidateResetPasswordBody, mockResetPassword);
      assert.equal(error, undefined);
    });

    it('should reject when new password is too short', () => {
      const { error } = validateJoiSchema(ValidateResetPasswordBody, {
        newPassword: 'short'
      });
      assert.notEqual(error, undefined);
    });
  });

  describe('ValidateChangePasswordBody', () => {
    it('should validate a valid change password request', () => {
      const { error } = validateJoiSchema(ValidateChangePasswordBody, mockChangePassword);
      assert.equal(error, undefined);
    });

    it('should reject when passwords do not match', () => {
      const { error } = validateJoiSchema(ValidateChangePasswordBody, {
        ...mockChangePassword,
        confirmNewPassword: 'DifferentPassword123'
      });
      assert.notEqual(error, undefined);
    });

    it('should reject when passwords are too short', () => {
      const { error } = validateJoiSchema(ValidateChangePasswordBody, {
        oldPassword: 'short',
        newPassword: 'short',
        confirmNewPassword: 'short'
      });
      assert.notEqual(error, undefined);
    });
  });
});
