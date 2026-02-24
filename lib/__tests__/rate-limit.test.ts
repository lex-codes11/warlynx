/**
 * Rate Limiting Tests
 * 
 * Tests for rate limiting utilities used across AI-powered endpoints
 * 
 * **Validates: Requirements 13.4**
 */

import {
  checkRateLimit,
  resetRateLimit,
  clearAllRateLimits,
  getRateLimitStatus,
  formatRateLimitError,
  getRateLimitHeaders,
  RATE_LIMITS,
  RateLimitConfig,
} from '../rate-limit';

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Clear all rate limits before each test
    clearAllRateLimits();
  });

  describe('checkRateLimit', () => {
    it('should allow first request', () => {
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 3,
      };

      const result = checkRateLimit('user1', config);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
      expect(result.limit).toBe(3);
      expect(result.resetAt).toBeGreaterThan(Date.now());
    });

    it('should allow requests up to the limit', () => {
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 3,
      };

      const result1 = checkRateLimit('user1', config);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(2);

      const result2 = checkRateLimit('user1', config);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(1);

      const result3 = checkRateLimit('user1', config);
      expect(result3.allowed).toBe(true);
      expect(result3.remaining).toBe(0);
    });

    it('should reject requests exceeding the limit', () => {
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 3,
      };

      // Make 3 requests (at limit)
      checkRateLimit('user1', config);
      checkRateLimit('user1', config);
      checkRateLimit('user1', config);

      // 4th request should be rejected
      const result = checkRateLimit('user1', config);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should track different users separately', () => {
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 2,
      };

      const result1 = checkRateLimit('user1', config);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(1);

      const result2 = checkRateLimit('user2', config);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(1);

      const result3 = checkRateLimit('user1', config);
      expect(result3.allowed).toBe(true);
      expect(result3.remaining).toBe(0);

      const result4 = checkRateLimit('user2', config);
      expect(result4.allowed).toBe(true);
      expect(result4.remaining).toBe(0);
    });

    it('should reset after window expires', async () => {
      const config: RateLimitConfig = {
        windowMs: 100, // 100ms window for testing
        maxRequests: 2,
      };

      // Use up the limit
      checkRateLimit('user1', config);
      checkRateLimit('user1', config);

      const result1 = checkRateLimit('user1', config);
      expect(result1.allowed).toBe(false);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be allowed again
      const result2 = checkRateLimit('user1', config);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(1);
    });

    it('should handle different rate limit keys', () => {
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 2,
      };

      // Different endpoints for same user
      const result1 = checkRateLimit('user1:endpoint1', config);
      expect(result1.allowed).toBe(true);

      const result2 = checkRateLimit('user1:endpoint2', config);
      expect(result2.allowed).toBe(true);

      // Each endpoint has its own limit
      checkRateLimit('user1:endpoint1', config);
      const result3 = checkRateLimit('user1:endpoint1', config);
      expect(result3.allowed).toBe(false);

      // Other endpoint still has capacity
      const result4 = checkRateLimit('user1:endpoint2', config);
      expect(result4.allowed).toBe(true);
    });
  });

  describe('resetRateLimit', () => {
    it('should reset rate limit for specific key', () => {
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 2,
      };

      // Use up the limit
      checkRateLimit('user1', config);
      checkRateLimit('user1', config);

      const result1 = checkRateLimit('user1', config);
      expect(result1.allowed).toBe(false);

      // Reset the limit
      resetRateLimit('user1');

      // Should be allowed again
      const result2 = checkRateLimit('user1', config);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(1);
    });

    it('should not affect other keys', () => {
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 2,
      };

      // Use up limits for both users
      checkRateLimit('user1', config);
      checkRateLimit('user1', config);
      checkRateLimit('user2', config);
      checkRateLimit('user2', config);

      // Reset only user1
      resetRateLimit('user1');

      // user1 should be reset
      const result1 = checkRateLimit('user1', config);
      expect(result1.allowed).toBe(true);

      // user2 should still be at limit
      const result2 = checkRateLimit('user2', config);
      expect(result2.allowed).toBe(false);
    });
  });

  describe('clearAllRateLimits', () => {
    it('should clear all rate limits', () => {
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 2,
      };

      // Use up limits for multiple users
      checkRateLimit('user1', config);
      checkRateLimit('user1', config);
      checkRateLimit('user2', config);
      checkRateLimit('user2', config);

      // Clear all
      clearAllRateLimits();

      // All should be reset
      const result1 = checkRateLimit('user1', config);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(1);

      const result2 = checkRateLimit('user2', config);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(1);
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return status without incrementing count', () => {
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 3,
      };

      // Make one request
      checkRateLimit('user1', config);

      // Check status multiple times
      const status1 = getRateLimitStatus('user1', config);
      expect(status1.remaining).toBe(2);

      const status2 = getRateLimitStatus('user1', config);
      expect(status2.remaining).toBe(2);

      // Status should not have changed
      const status3 = getRateLimitStatus('user1', config);
      expect(status3.remaining).toBe(2);
    });

    it('should return correct status for new key', () => {
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 5,
      };

      const status = getRateLimitStatus('newuser', config);
      expect(status.allowed).toBe(true);
      expect(status.remaining).toBe(5);
      expect(status.limit).toBe(5);
    });
  });

  describe('formatRateLimitError', () => {
    it('should format error with correct structure', () => {
      const result = {
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 3600000, // 1 hour from now
        limit: 3,
      };

      const error = formatRateLimitError(result, 'test endpoint');

      expect(error.success).toBe(false);
      expect(error.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.error.message).toContain('test endpoint');
      expect(error.error.retryable).toBe(true);
      expect(error.error.resetAt).toBeDefined();
    });

    it('should include time until reset in error message', () => {
      const result = {
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 120000, // 2 minutes from now
        limit: 3,
      };

      const error = formatRateLimitError(result, 'test endpoint');

      expect(error.error.details).toContain('2 minutes');
    });

    it('should show seconds for short durations', () => {
      const result = {
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 30000, // 30 seconds from now
        limit: 3,
      };

      const error = formatRateLimitError(result, 'test endpoint');

      expect(error.error.details).toContain('seconds');
    });
  });

  describe('getRateLimitHeaders', () => {
    it('should return correct headers for allowed request', () => {
      const result = {
        allowed: true,
        remaining: 2,
        resetAt: Date.now() + 3600000,
        limit: 5,
      };

      const headers = getRateLimitHeaders(result);

      expect(headers['X-RateLimit-Limit']).toBe('5');
      expect(headers['X-RateLimit-Remaining']).toBe('2');
      expect(headers['X-RateLimit-Reset']).toBeDefined();
      expect(headers['Retry-After']).toBeUndefined();
    });

    it('should include Retry-After header for rejected request', () => {
      const result = {
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 60000, // 1 minute from now
        limit: 3,
      };

      const headers = getRateLimitHeaders(result);

      expect(headers['X-RateLimit-Limit']).toBe('3');
      expect(headers['X-RateLimit-Remaining']).toBe('0');
      expect(headers['Retry-After']).toBeDefined();
      expect(parseInt(headers['Retry-After'])).toBeGreaterThan(0);
    });
  });

  describe('RATE_LIMITS configuration', () => {
    it('should have IMAGE_GENERATION config', () => {
      expect(RATE_LIMITS.IMAGE_GENERATION).toBeDefined();
      expect(RATE_LIMITS.IMAGE_GENERATION.windowMs).toBeGreaterThan(0);
      expect(RATE_LIMITS.IMAGE_GENERATION.maxRequests).toBeGreaterThan(0);
    });

    it('should have CHARACTER_CREATION config', () => {
      expect(RATE_LIMITS.CHARACTER_CREATION).toBeDefined();
      expect(RATE_LIMITS.CHARACTER_CREATION.windowMs).toBeGreaterThan(0);
      expect(RATE_LIMITS.CHARACTER_CREATION.maxRequests).toBeGreaterThan(0);
    });

    it('should have TURN_PROCESSING config', () => {
      expect(RATE_LIMITS.TURN_PROCESSING).toBeDefined();
      expect(RATE_LIMITS.TURN_PROCESSING.windowMs).toBeGreaterThan(0);
      expect(RATE_LIMITS.TURN_PROCESSING.maxRequests).toBeGreaterThan(0);
    });

    it('should have AI_REQUESTS config', () => {
      expect(RATE_LIMITS.AI_REQUESTS).toBeDefined();
      expect(RATE_LIMITS.AI_REQUESTS.windowMs).toBeGreaterThan(0);
      expect(RATE_LIMITS.AI_REQUESTS.maxRequests).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle concurrent requests correctly', () => {
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 3,
      };

      // Simulate concurrent requests
      const results = [
        checkRateLimit('user1', config),
        checkRateLimit('user1', config),
        checkRateLimit('user1', config),
      ];

      expect(results[0].allowed).toBe(true);
      expect(results[1].allowed).toBe(true);
      expect(results[2].allowed).toBe(true);

      // Next request should be rejected
      const result = checkRateLimit('user1', config);
      expect(result.allowed).toBe(false);
    });

    it('should handle limit of 1', () => {
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 1,
      };

      const result1 = checkRateLimit('user1', config);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(0);

      const result2 = checkRateLimit('user1', config);
      expect(result2.allowed).toBe(false);
    });

    it('should handle very short windows', async () => {
      const config: RateLimitConfig = {
        windowMs: 50, // 50ms
        maxRequests: 1,
      };

      checkRateLimit('user1', config);
      
      const result1 = checkRateLimit('user1', config);
      expect(result1.allowed).toBe(false);

      await new Promise((resolve) => setTimeout(resolve, 60));

      const result2 = checkRateLimit('user1', config);
      expect(result2.allowed).toBe(true);
    });

    it('should handle empty key string', () => {
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 2,
      };

      const result = checkRateLimit('', config);
      expect(result.allowed).toBe(true);
    });
  });
});
