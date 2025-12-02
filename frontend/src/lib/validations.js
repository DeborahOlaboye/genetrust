import * as z from 'zod';

// Common validation schemas
export const emailSchema = z.string().email('Please enter a valid email address');
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  );

export const confirmPasswordSchema = (fieldName = 'password') => 
  z.string().refine(
    (data, ctx) => {
      return data === ctx.parent[fieldName];
    },
    {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }
  );

// Common validation messages
export const validationMessages = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  minLength: (length) => `Must be at least ${length} characters`,
  maxLength: (length) => `Must be at most ${length} characters`,
  url: 'Please enter a valid URL',
  number: 'Please enter a valid number',
  integer: 'Must be a whole number',
  positive: 'Must be a positive number',
  min: (min) => `Must be greater than or equal to ${min}`,
  max: (max) => `Must be less than or equal to ${max}`,
  pattern: 'Invalid format',
};

// Helper function to create validation schemas
export const createSchema = (fields) => {
  return z.object(fields);
};

// Example usage:
// const loginSchema = createSchema({
//   email: emailSchema,
//   password: passwordSchema,
// });
