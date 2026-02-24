/**
 * Rate Limiting Utilities
 * 
 * Provides rate limiting functionality for AI-powered endpoints to prevent abuse
 * and manage API costs.
 * 
 * **Validates: Requirements 13.4**
 */

/**
 * Rate limit configuration for different endpoint types
 */
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests allowed in the window
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

/**
 * Rate limit store entry
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * In-memory rate limiting store
 * Structure: Map<key, { count: number, resetAt: number }>
 * 
 * Note: For production with multiple instances, use Redis instead
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Predefined rate limit configurations
 */
export const RATE_LIMITS = {
  IMAGE_GENERATION: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: parseInt(process.env.RATE_LIMIT_IMAGE_GENERATION || '3', 10),
  },
  CHARACTER_CREATION: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: parseInt(process.env.RATE_LIMIT_CHARACTER_CREATION || '5', 10),
  },
  TURN_PROCESSING: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_TURN_PROCESSING || '10', 10),
  },
  AI_REQUESTS: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: parseInt(process.env.RATE_LIMIT_AI_REQUESTS || '100', 10),
  },
} as const;

/**
 * Check if a request should be rate limited
 * 
 * @param key - Unique identifier for the rate limit (e.g., userId, userId:endpoint)
 * @param config - Rate limit configuration
 * @returns Rate limit result with allowed status and metadata
 * 
 * **Validates: Requirements 13.4**
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // No previous requests or window expired
  if (!entry || now >= entry.resetAt) {
    const resetAt = now + config.windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt,
      limit: config.maxRequests,
    };
  }

  // Within rate limit window
  if (entry.count < config.maxRequests) {
    entry.count++;
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetAt: entry.resetAt,
      limit: config.maxRequests,
    };
  }

  // Rate limit exceeded
  return {
    allowed: false,
    remaining: 0,
    resetAt: entry.resetAt,
    limit: config.maxRequests,
  };
}

/**
 * Reset rate limit for a specific key
 * Useful for testing or manual intervention
 * 
 * @param key - Unique identifier for the rate limit
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Clear all rate limits
 * Useful for testing
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}

/**
 * Get current rate limit status without incrementing
 * 
 * @param key - Unique identifier for the rate limit
 * @param config - Rate limit configuration
 * @returns Current rate limit status
 */
export function getRateLimitStatus(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // No previous requests or window expired
  if (!entry || now >= entry.resetAt) {
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: now + config.windowMs,
      limit: config.maxRequests,
    };
  }

  // Within rate limit window
  const remaining = Math.max(0, config.maxRequests - entry.count);
  return {
    allowed: remaining > 0,
    remaining,
    resetAt: entry.resetAt,
    limit: config.maxRequests,
  };
}

/**
 * Format rate limit error response
 * 
 * @param result - Rate limit result
 * @param endpoint - Endpoint name for error message
 * @returns Formatted error object
 */
export function formatRateLimitError(
  result: RateLimitResult,
  endpoint: string
) {
  const resetInSeconds = Math.ceil((result.resetAt - Date.now()) / 1000);
  const resetInMinutes = Math.ceil(resetInSeconds / 60);
  
  const timeMessage = resetInMinutes > 1
    ? `${resetInMinutes} minutes`
    : `${resetInSeconds} seconds`;

  return {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Rate limit exceeded for ${endpoint}`,
      details: `You have reached the maximum number of requests. Please try again in ${timeMessage}.`,
      retryable: true,
      resetAt: new Date(result.resetAt).toISOString(),
    },
  };
}

/**
 * Get rate limit headers for response
 * 
 * @param result - Rate limit result
 * @returns Headers object
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const resetInSeconds = Math.ceil((result.resetAt - Date.now()) / 1000);
  
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toString(),
    ...(result.allowed ? {} : { 'Retry-After': resetInSeconds.toString() }),
  };
}
