export const mockUser = {
  name: 'Test User',
  emailAddress: 'test@example.com',
  phoneNumber: '1234567890',
  password: 'Password123',
  consent: true
};

export const mockLoginCredentials = {
  emailAddress: 'test@example.com',
  password: 'Password123'
};

export const mockForgotPassword = {
  emailAddress: 'test@example.com'
};

export const mockResetPassword = {
  newPassword: 'NewPassword123'
};

export const mockChangePassword = {
  oldPassword: 'Password123',
  newPassword: 'NewPassword123',
  confirmNewPassword: 'NewPassword123'
};

export const mockInvalidUser = {
  name: 'T', // too short
  emailAddress: 'invalid-email',
  phoneNumber: '123', // too short
  password: 'short', // too short
  consent: false // should be true
};
