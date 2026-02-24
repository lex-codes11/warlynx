# Rate Limiting Implementation

This document describes the rate limiting implementation for AI-powered endpoints in the Warlynx application.

## Overview

Rate limiting is implemented to prevent abuse and manage API costs for AI-powered endpoints. The system tracks requests per user and returns appropriate error responses when limits are exceeded.

**Validates: Requirements 13.4**

## Architecture

### Centralized Rate Limiting Module

The rate limiting functionality is centralized in `lib/rate-limit.ts`, which provides:

- **Configurable rate limits** for different endpoint types
- **In-memory storage** for rate limit tracking (can be replaced with Redis for production)
- **Standardized error responses** and headers
- **Utility functions** for checking, resetting, and managing rate limits

### Rate Limit Configurations

The following rate limits are configured by default (can be overridden via environment variables):

| Endpoint Type | Default Limit | Window | Environment Variable |
|--------------|---------------|--------|---------------------|
| Image Generation | 3 requests | 1 hour | `RATE_LIMIT_IMAGE_GENERATION` |
| Character Creation | 5 requests | 1 hour | `RATE_LIMIT_CHARACTER_CREATION` |
| Turn Processing | 10 requests | 1 minute | `RATE_LIMIT_TURN_PROCESSING` |
| AI Requests (General) | 100 requests | 1 hour | `RATE_LIMIT_AI_REQUESTS` |

## Protected Endpoints

### 1. Character Creation (`POST /api/characters/create`)

**Rate Limit Key**: `character-creation:{userId}`

**Purpose**: Prevents abuse of AI-powered character generation (Power Sheet + Image)

**Implementation**:
```typescript
const rateLimitKey = `character-creation:${userId}`;
const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.CHARACTER_CREATION);

if (!rateLimit.allowed) {
  return NextResponse.json(
    formatRateLimitError(rateLimit, 'character creation'),
    { status: 429, headers: getRateLimitHeaders(rateLimit) }
  );
}
```

### 2. Image Regeneration (`POST /api/characters/[characterId]/regenerate-image`)

**Rate Limit Key**: `image-regeneration:{userId}`

**Purpose**: Prevents excessive image regeneration requests

**Implementation**:
```typescript
const rateLimitKey = `image-regeneration:${userId}`;
const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.IMAGE_GENERATION);

if (!rateLimit.allowed) {
  return NextResponse.json(
    formatRateLimitError(rateLimit, 'image regeneration'),
    { status: 429, headers: getRateLimitHeaders(rateLimit) }
  );
}
```

### 3. Turn Processing (`POST /api/game/[gameId]/turn`)

**Rate Limit Key**: `turn-processing:{userId}`

**Purpose**: Prevents rapid-fire turn submissions that could abuse the AI DM

**Implementation**:
```typescript
const rateLimitKey = `turn-processing:${userId}`;
const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.TURN_PROCESSING);

if (!rateLimit.allowed) {
  return NextResponse.json(
    formatRateLimitError(rateLimit, 'turn processing'),
    { status: 429, headers: getRateLimitHeaders(rateLimit) }
  );
}
```

## API Response Format

### Success Response

When a request is allowed, the response includes rate limit headers:

```typescript
{
  success: true,
  data: { ... },
  // Optional rate limit info in body
  rateLimit: {
    remaining: 2,
    resetAt: "2024-01-15T12:00:00.000Z"
  }
}
```

**Headers**:
- `X-RateLimit-Limit`: Maximum requests allowed in the window
- `X-RateLimit-Remaining`: Requests remaining in the current window
- `X-RateLimit-Reset`: Timestamp when the rate limit resets

### Rate Limit Exceeded Response

When a request exceeds the rate limit:

```typescript
{
  success: false,
  error: {
    code: "RATE_LIMIT_EXCEEDED",
    message: "Rate limit exceeded for {endpoint}",
    details: "You have reached the maximum number of requests. Please try again in {time}.",
    retryable: true,
    resetAt: "2024-01-15T12:00:00.000Z"
  }
}
```

**Status Code**: `429 Too Many Requests`

**Headers**:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: `0`
- `X-RateLimit-Reset`: Timestamp when the rate limit resets
- `Retry-After`: Seconds until the rate limit resets

## Usage

### Checking Rate Limits

```typescript
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

const result = checkRateLimit('user-123', RATE_LIMITS.IMAGE_GENERATION);

if (!result.allowed) {
  // Handle rate limit exceeded
  console.log(`Rate limit exceeded. Reset at: ${result.resetAt}`);
} else {
  // Process request
  console.log(`Request allowed. ${result.remaining} remaining`);
}
```

### Getting Rate Limit Status (Without Incrementing)

```typescript
import { getRateLimitStatus, RATE_LIMITS } from '@/lib/rate-limit';

const status = getRateLimitStatus('user-123', RATE_LIMITS.IMAGE_GENERATION);
console.log(`User has ${status.remaining} requests remaining`);
```

### Resetting Rate Limits

```typescript
import { resetRateLimit, clearAllRateLimits } from '@/lib/rate-limit';

// Reset for specific user
resetRateLimit('user-123');

// Clear all rate limits (useful for testing)
clearAllRateLimits();
```

### Custom Rate Limit Configuration

```typescript
import { checkRateLimit, RateLimitConfig } from '@/lib/rate-limit';

const customConfig: RateLimitConfig = {
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 10,
};

const result = checkRateLimit('user-123', customConfig);
```

## Testing

### Unit Tests

The rate limiting module includes comprehensive unit tests in `lib/__tests__/rate-limit.test.ts`:

- Basic rate limiting functionality
- Multiple users tracking
- Window expiration
- Rate limit reset
- Error formatting
- Header generation
- Edge cases

### Integration Tests

Each protected endpoint includes tests for rate limiting:

- `app/api/characters/create/__tests__/route.test.ts`
- `app/api/characters/[characterId]/regenerate-image/__tests__/route.test.ts`
- `app/api/game/[gameId]/turn/__tests__/route.test.ts`

**Important**: Tests must call `clearAllRateLimits()` in `beforeEach` to prevent rate limit state from affecting test results.

```typescript
import { clearAllRateLimits } from '@/lib/rate-limit';

beforeEach(() => {
  jest.clearAllMocks();
  clearAllRateLimits(); // Clear rate limits between tests
});
```

## Production Considerations

### Redis Integration

For production deployments with multiple server instances, replace the in-memory store with Redis:

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now();
  const redisKey = `rate-limit:${key}`;
  
  // Use Redis INCR with EXPIRE for atomic rate limiting
  const count = await redis.incr(redisKey);
  
  if (count === 1) {
    await redis.pexpire(redisKey, config.windowMs);
  }
  
  const ttl = await redis.pttl(redisKey);
  const resetAt = now + ttl;
  
  return {
    allowed: count <= config.maxRequests,
    remaining: Math.max(0, config.maxRequests - count),
    resetAt,
    limit: config.maxRequests,
  };
}
```

### Environment Variables

Configure rate limits via environment variables:

```bash
# .env
RATE_LIMIT_IMAGE_GENERATION=3
RATE_LIMIT_CHARACTER_CREATION=5
RATE_LIMIT_TURN_PROCESSING=10
RATE_LIMIT_AI_REQUESTS=100
```

### Monitoring

Consider adding monitoring for rate limit hits:

```typescript
if (!rateLimit.allowed) {
  // Log rate limit hit for monitoring
  console.warn('Rate limit exceeded', {
    userId,
    endpoint: 'character-creation',
    resetAt: rateLimit.resetAt,
  });
  
  // Send to monitoring service (e.g., Sentry, DataDog)
  // monitoringService.trackRateLimitHit({ userId, endpoint });
}
```

### Rate Limit Bypass for Testing

For development/testing, you can bypass rate limits:

```typescript
const BYPASS_RATE_LIMIT = process.env.NODE_ENV === 'development' && 
                          process.env.BYPASS_RATE_LIMIT === 'true';

if (!BYPASS_RATE_LIMIT) {
  const rateLimit = checkRateLimit(rateLimitKey, config);
  if (!rateLimit.allowed) {
    // Return rate limit error
  }
}
```

## Security Considerations

1. **User-based tracking**: Rate limits are tracked per user ID, preventing one user from affecting others
2. **Endpoint-specific keys**: Different endpoints have separate rate limit counters
3. **Server-side enforcement**: All rate limiting is enforced server-side to prevent client-side bypass
4. **Graceful degradation**: Rate limit errors are clear and include retry information
5. **No sensitive data**: Rate limit responses don't expose sensitive system information

## Future Enhancements

1. **Dynamic rate limits**: Adjust limits based on user tier (free, premium, etc.)
2. **Burst allowance**: Allow short bursts above the limit with token bucket algorithm
3. **IP-based rate limiting**: Add IP-based limits for unauthenticated endpoints
4. **Rate limit analytics**: Track and analyze rate limit patterns
5. **Automatic scaling**: Adjust limits based on system load and API costs
