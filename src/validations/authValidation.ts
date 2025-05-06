import { z, ZodError, ZodFormattedError } from 'zod';

export const ValidateRegisterBody = z.object({
  name: z.string().min(2).max(72).trim(),
  emailAddress: z.string().email().trim(),
  phoneNumber: z.string().min(4).max(20).trim(),
  password: z.string().min(8).max(24).trim(),
  consent: z.boolean().refine((val) => val === true, {
    message: 'You must consent to the terms and conditions'
  })
});

export const ValidateLoginBody = z.object({
  emailAddress: z.string().email().trim(),
  password: z.string().min(8).max(24).trim()
});

export const ValidateForgotPasswordBody = z.object({
  emailAddress: z.string().email().trim()
});

export const ValidateResetPasswordBody = z.object({
  newPassword: z.string().min(8).max(24).trim()
});

export const ValidateChangePasswordBody = z
  .object({
    oldPassword: z.string().min(8).max(24).trim(),
    newPassword: z.string().min(8).max(24).trim(),
    confirmNewPassword: z.string().min(8).max(24).trim()
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Passwords do not match',
    path: ['confirmNewPassword']
  });

// Define interfaces for the return type
interface SuccessResult<T> {
  value: T;
  error: null;
}

interface ErrorResult {
  value: null;
  error: ZodFormattedError<unknown> | ZodError;
}

type ValidationResult<T> = SuccessResult<T> | ErrorResult;

export const validateSchema = <T>(schema: z.Schema<T>, value: unknown): ValidationResult<T> => {
  try {
    const result: T = schema.parse(value);
    return {
      value: result,
      error: null
    };
  } catch (error) {
    // Check if it's a ZodError and has the format method
    if (error instanceof ZodError && typeof error.format === 'function') {
      return {
        value: null,
        error: error.format() as ZodFormattedError<unknown>
      };
    }

    return {
      value: null,
      error: error as ZodError
    };
  }
};
