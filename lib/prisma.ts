import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Connection pooling configuration
// These can be overridden via DATABASE_URL query parameters
const connectionPoolConfig = {
  // Maximum number of connections in the pool
  connection_limit: process.env.DATABASE_CONNECTION_LIMIT
    ? parseInt(process.env.DATABASE_CONNECTION_LIMIT, 10)
    : 10,
  // Connection timeout in seconds
  pool_timeout: process.env.DATABASE_POOL_TIMEOUT
    ? parseInt(process.env.DATABASE_POOL_TIMEOUT, 10)
    : 10,
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    // Connection pool is configured via DATABASE_URL query parameters
    // Example: postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=10
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Transaction utilities

/**
 * Execute a function within a Prisma transaction
 * Automatically handles rollback on error
 * 
 * @example
 * const result = await withTransaction(async (tx) => {
 *   const user = await tx.user.create({ data: { email: 'test@example.com' } });
 *   const game = await tx.game.create({ data: { hostId: user.id, name: 'Test Game' } });
 *   return { user, game };
 * });
 */
export async function withTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: {
    maxWait?: number; // Maximum time to wait for a transaction slot (ms)
    timeout?: number; // Maximum time the transaction can run (ms)
    isolationLevel?: Prisma.TransactionIsolationLevel;
  }
): Promise<T> {
  return prisma.$transaction(fn, {
    maxWait: options?.maxWait ?? 5000, // Default 5 seconds
    timeout: options?.timeout ?? 10000, // Default 10 seconds
    isolationLevel: options?.isolationLevel,
  });
}

/**
 * Execute multiple operations in a transaction using interactive transaction API
 * Useful for complex multi-step operations that need conditional logic
 * 
 * @example
 * await executeTransaction(async (tx) => {
 *   const game = await tx.game.findUnique({ where: { id: gameId } });
 *   if (game.status !== 'lobby') {
 *     throw new Error('Game already started');
 *   }
 *   await tx.game.update({
 *     where: { id: gameId },
 *     data: { status: 'active', startedAt: new Date() }
 *   });
 * });
 */
export async function executeTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: {
    maxWait?: number;
    timeout?: number;
    isolationLevel?: Prisma.TransactionIsolationLevel;
  }
): Promise<T> {
  return withTransaction(fn, options);
}

/**
 * Execute operations in a batch transaction
 * All operations succeed or all fail together
 * 
 * @example
 * await batchTransaction([
 *   prisma.user.create({ data: { email: 'user1@example.com' } }),
 *   prisma.user.create({ data: { email: 'user2@example.com' } }),
 * ]);
 */
export async function batchTransaction<T extends readonly any[]>(
  operations: [...T]
): Promise<any> {
  return prisma.$transaction(operations as any);
}

/**
 * Retry a database operation with exponential backoff
 * Useful for handling transient connection errors
 * 
 * @example
 * const user = await retryOperation(
 *   () => prisma.user.findUnique({ where: { id: userId } }),
 *   { maxRetries: 3, initialDelay: 100 }
 * );
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  options?: {
    maxRetries?: number;
    initialDelay?: number; // milliseconds
    maxDelay?: number; // milliseconds
    backoffMultiplier?: number;
  }
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  const initialDelay = options?.initialDelay ?? 100;
  const maxDelay = options?.maxDelay ?? 5000;
  const backoffMultiplier = options?.backoffMultiplier ?? 2;

  let lastError: Error | undefined;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Only retry on connection/timeout errors
      const errorMessage = lastError.message.toLowerCase();
      const isRetryable =
        errorMessage.includes("connection") ||
        errorMessage.includes("timeout") ||
        errorMessage.includes("econnrefused") ||
        errorMessage.includes("enotfound");

      if (!isRetryable) {
        throw lastError;
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Check database connection health
 * Useful for health check endpoints
 * 
 * @example
 * const isHealthy = await checkDatabaseHealth();
 * if (!isHealthy) {
 *   console.error('Database connection failed');
 * }
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}

/**
 * Gracefully disconnect from the database
 * Should be called on application shutdown
 * 
 * @example
 * process.on('SIGTERM', async () => {
 *   await disconnectDatabase();
 *   process.exit(0);
 * });
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
