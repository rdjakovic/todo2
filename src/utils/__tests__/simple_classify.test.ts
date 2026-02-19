
import { describe, it, expect } from 'vitest';
import { SecurityErrorHandler } from '../securityErrorHandler';
import { AuthSecurityErrorType } from '../../const/securityMessages';

describe('Simple Classification Test', () => {
  const errorHandler = new SecurityErrorHandler();
  
  it('should classify invalid credentials', () => {
    const error = new Error('Invalid email or password');
    // @ts-ignore
    const type = errorHandler.classifyError(error);
    expect(type).toBe(AuthSecurityErrorType.INVALID_CREDENTIALS);
  });
});
