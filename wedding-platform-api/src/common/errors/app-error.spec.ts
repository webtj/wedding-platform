import { describe, expect, it } from 'vitest';
import { AppError } from './app-error';

describe('AppError', () => {
  describe('constructor', () => {
    it('creates an instance with defaults', () => {
      const error = new AppError('INTERNAL_ERROR', 'something broke');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.name).toBe('AppError');
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.message).toBe('something broke');
      expect(error.statusCode).toBe(400);
      expect(error.details).toBeUndefined();
    });

    it('accepts a custom statusCode and details', () => {
      const details = { field: 'email' };
      const error = new AppError('VALIDATION_ERROR', 'bad email', 422, details);
      expect(error.statusCode).toBe(422);
      expect(error.details).toEqual(details);
    });
  });

  describe('notFound', () => {
    it('formats message with id', () => {
      const error = AppError.notFound('User', 'u_123');
      expect(error.code).toBe('RESOURCE_NOT_FOUND');
      expect(error.message).toBe('User (id: u_123) not found');
      expect(error.statusCode).toBe(404);
    });

    it('formats message without id', () => {
      const error = AppError.notFound('User');
      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
    });
  });

  describe('forbidden', () => {
    it('uses default message', () => {
      const error = AppError.forbidden();
      expect(error.code).toBe('PERMISSION_DENIED');
      expect(error.message).toBe('Access denied');
      expect(error.statusCode).toBe(403);
    });

    it('accepts a custom message', () => {
      const error = AppError.forbidden('No workspace access');
      expect(error.message).toBe('No workspace access');
    });
  });

  describe('badRequest', () => {
    it('includes optional details', () => {
      const details = { field: 'phone' };
      const error = AppError.badRequest('phone is invalid', details);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual(details);
    });
  });

  describe('conflict', () => {
    it('uses status 409', () => {
      const error = AppError.conflict('Email already taken');
      expect(error.code).toBe('RESOURCE_CONFLICT');
      expect(error.statusCode).toBe(409);
    });
  });

  describe('internal', () => {
    it('uses default message and status 500', () => {
      const error = AppError.internal();
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.message).toBe('Internal server error');
      expect(error.statusCode).toBe(500);
    });

    it('accepts a custom message', () => {
      const error = AppError.internal('DB down');
      expect(error.message).toBe('DB down');
    });
  });
});
