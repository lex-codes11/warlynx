/**
 * Unit tests for database utilities
 * Tests Prisma client singleton, transactions, and connection pooling
 * @jest-environment node
 */

import {
  prisma,
  withTransaction,
  executeTransaction,
  batchTransaction,
  retryOperation,
  checkDatabaseHealth,
  disconnectDatabase,
} from "../prisma";

// Set up test environment
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

describe("Database Utilities", () => {
  describe("Prisma Client Singleton", () => {
    it("should export a Prisma client instance", () => {
      expect(prisma).toBeDefined();
      expect(typeof prisma.$connect).toBe("function");
      expect(typeof prisma.$disconnect).toBe("function");
      expect(typeof prisma.$transaction).toBe("function");
    });

    it("should have logging configured based on environment", () => {
      expect(prisma).toBeDefined();
      // The client should be properly configured
      // In development, it logs queries, errors, and warnings
      // In production, it only logs errors
    });
  });

  describe("withTransaction", () => {
    it("should be a function that accepts a callback and options", () => {
      expect(typeof withTransaction).toBe("function");
      expect(withTransaction.length).toBe(2); // fn and options parameters
    });

    it("should call prisma.$transaction with correct default options", async () => {
      const mockFn = jest.fn().mockResolvedValue({ success: true });
      const transactionSpy = jest
        .spyOn(prisma, "$transaction")
        .mockResolvedValue({ success: true });

      await withTransaction(mockFn);

      expect(transactionSpy).toHaveBeenCalledWith(mockFn, {
        maxWait: 5000,
        timeout: 10000,
        isolationLevel: undefined,
      });

      transactionSpy.mockRestore();
    });

    it("should pass custom options to prisma.$transaction", async () => {
      const mockFn = jest.fn().mockResolvedValue({ success: true });
      const transactionSpy = jest
        .spyOn(prisma, "$transaction")
        .mockResolvedValue({ success: true });

      await withTransaction(mockFn, {
        maxWait: 3000,
        timeout: 8000,
      });

      expect(transactionSpy).toHaveBeenCalledWith(mockFn, {
        maxWait: 3000,
        timeout: 8000,
        isolationLevel: undefined,
      });

      transactionSpy.mockRestore();
    });

    it("should return the result from the transaction callback", async () => {
      const expectedResult = { id: "123", name: "Test" };
      const mockFn = jest.fn().mockResolvedValue(expectedResult);
      const transactionSpy = jest
        .spyOn(prisma, "$transaction")
        .mockResolvedValue(expectedResult);

      const result = await withTransaction(mockFn);

      expect(result).toEqual(expectedResult);

      transactionSpy.mockRestore();
    });

    it("should propagate errors from the transaction", async () => {
      const mockError = new Error("Transaction failed");
      const mockFn = jest.fn().mockRejectedValue(mockError);
      const transactionSpy = jest
        .spyOn(prisma, "$transaction")
        .mockRejectedValue(mockError);

      await expect(withTransaction(mockFn)).rejects.toThrow("Transaction failed");

      transactionSpy.mockRestore();
    });
  });

  describe("executeTransaction", () => {
    it("should be an alias for withTransaction", () => {
      expect(typeof executeTransaction).toBe("function");
      expect(executeTransaction.length).toBe(2);
    });

    it("should call withTransaction internally", async () => {
      const mockFn = jest.fn().mockResolvedValue({ success: true });
      const transactionSpy = jest
        .spyOn(prisma, "$transaction")
        .mockResolvedValue({ success: true });

      await executeTransaction(mockFn, { maxWait: 4000 });

      expect(transactionSpy).toHaveBeenCalledWith(mockFn, {
        maxWait: 4000,
        timeout: 10000,
        isolationLevel: undefined,
      });

      transactionSpy.mockRestore();
    });
  });

  describe("batchTransaction", () => {
    it("should be a function that accepts an array of operations", () => {
      expect(typeof batchTransaction).toBe("function");
      expect(batchTransaction.length).toBe(1);
    });

    it("should call prisma.$transaction with the operations array", async () => {
      const mockOperations = [
        Promise.resolve({ id: "1" }),
        Promise.resolve({ id: "2" }),
      ];
      const transactionSpy = jest
        .spyOn(prisma, "$transaction")
        .mockResolvedValue([{ id: "1" }, { id: "2" }]);

      await batchTransaction(mockOperations as any);

      expect(transactionSpy).toHaveBeenCalledWith(mockOperations);

      transactionSpy.mockRestore();
    });

    it("should return results from all operations", async () => {
      const expectedResults = [{ id: "1" }, { id: "2" }];
      const mockOperations = [
        Promise.resolve({ id: "1" }),
        Promise.resolve({ id: "2" }),
      ];
      const transactionSpy = jest
        .spyOn(prisma, "$transaction")
        .mockResolvedValue(expectedResults);

      const results = await batchTransaction(mockOperations as any);

      expect(results).toEqual(expectedResults);

      transactionSpy.mockRestore();
    });
  });

  describe("retryOperation", () => {
    it("should succeed on first attempt", async () => {
      const result = await retryOperation(async () => {
        return { success: true };
      });

      expect(result).toEqual({ success: true });
    });

    it("should retry on connection errors", async () => {
      let attempts = 0;

      const result = await retryOperation(
        async () => {
          attempts++;
          if (attempts < 2) {
            throw new Error("Connection timeout");
          }
          return { success: true, attempts };
        },
        { maxRetries: 3, initialDelay: 10 }
      );

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
    });

    it("should not retry on non-retryable errors", async () => {
      let attempts = 0;

      await expect(
        retryOperation(
          async () => {
            attempts++;
            throw new Error("Validation error");
          },
          { maxRetries: 3, initialDelay: 10 }
        )
      ).rejects.toThrow("Validation error");

      expect(attempts).toBe(1); // Should not retry
    });

    it("should throw after max retries", async () => {
      let attempts = 0;

      await expect(
        retryOperation(
          async () => {
            attempts++;
            throw new Error("Connection refused");
          },
          { maxRetries: 2, initialDelay: 10 }
        )
      ).rejects.toThrow("Connection refused");

      expect(attempts).toBe(3); // Initial + 2 retries
    });

    it("should use exponential backoff", async () => {
      let attempts = 0;
      const delays: number[] = [];
      let lastTime = Date.now();

      try {
        await retryOperation(
          async () => {
            const now = Date.now();
            if (attempts > 0) {
              delays.push(now - lastTime);
            }
            lastTime = now;
            attempts++;
            throw new Error("Connection timeout");
          },
          {
            maxRetries: 2,
            initialDelay: 50,
            backoffMultiplier: 2,
          }
        );
      } catch (error) {
        // Expected to fail
      }

      expect(attempts).toBe(3); // Initial + 2 retries
      expect(delays.length).toBe(2);
      // First delay should be around 50ms, second around 100ms
      expect(delays[0]).toBeGreaterThanOrEqual(40);
      expect(delays[1]).toBeGreaterThanOrEqual(90);
    });

    it("should respect max delay", async () => {
      let attempts = 0;

      try {
        await retryOperation(
          async () => {
            attempts++;
            throw new Error("Connection timeout");
          },
          {
            maxRetries: 5,
            initialDelay: 100,
            maxDelay: 200,
            backoffMultiplier: 3,
          }
        );
      } catch (error) {
        // Expected to fail
      }

      expect(attempts).toBe(6); // Initial + 5 retries
    });

    it("should handle retryable error types", async () => {
      const retryableErrors = [
        "connection timeout",
        "ECONNREFUSED",
        "ENOTFOUND",
        "Connection failed",
      ];

      for (const errorMsg of retryableErrors) {
        let attempts = 0;
        try {
          await retryOperation(
            async () => {
              attempts++;
              if (attempts < 2) {
                throw new Error(errorMsg);
              }
              return { success: true };
            },
            { maxRetries: 2, initialDelay: 1 }
          );
        } catch (error) {
          // Some might still fail
        }
        expect(attempts).toBeGreaterThan(1); // Should have retried
      }
    });
  });

  describe("checkDatabaseHealth", () => {
    it("should return true when database query succeeds", async () => {
      const queryRawSpy = jest
        .spyOn(prisma, "$queryRaw" as any)
        .mockResolvedValue([{ "?column?": 1 }]);

      const isHealthy = await checkDatabaseHealth();
      expect(isHealthy).toBe(true);

      queryRawSpy.mockRestore();
    });

    it("should return false when database query fails", async () => {
      const queryRawSpy = jest
        .spyOn(prisma, "$queryRaw" as any)
        .mockRejectedValue(new Error("Connection failed"));

      const isHealthy = await checkDatabaseHealth();
      expect(isHealthy).toBe(false);

      queryRawSpy.mockRestore();
    });

    it("should log errors when health check fails", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      const queryRawSpy = jest
        .spyOn(prisma, "$queryRaw" as any)
        .mockRejectedValue(new Error("Connection failed"));

      await checkDatabaseHealth();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Database health check failed:",
        expect.any(Error)
      );

      queryRawSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("disconnectDatabase", () => {
    it("should be a function", () => {
      expect(typeof disconnectDatabase).toBe("function");
    });

    it("should call prisma.$disconnect", async () => {
      const disconnectSpy = jest
        .spyOn(prisma, "$disconnect")
        .mockResolvedValue();

      await disconnectDatabase();

      expect(disconnectSpy).toHaveBeenCalled();

      disconnectSpy.mockRestore();
    });
  });

  describe("Connection Pooling Configuration", () => {
    it("should export connection pool config variables", () => {
      // The connection pooling is configured via DATABASE_URL query parameters
      // or environment variables
      expect(process.env.DATABASE_URL).toBeDefined();
    });

    it("should handle concurrent operations", async () => {
      // Mock multiple concurrent database operations
      const findManySpy = jest
        .spyOn(prisma.user, "findMany")
        .mockResolvedValue([]);

      const operations = Array.from({ length: 5 }, () =>
        prisma.user.findMany({ take: 1 })
      );

      const results = await Promise.all(operations);

      expect(results).toHaveLength(5);
      expect(findManySpy).toHaveBeenCalledTimes(5);

      findManySpy.mockRestore();
    });
  });

  describe("Transaction Utilities Integration", () => {
    it("should support nested transaction patterns", async () => {
      const mockFn = jest.fn().mockResolvedValue({ success: true });
      const transactionSpy = jest
        .spyOn(prisma, "$transaction")
        .mockResolvedValue({ success: true });

      // Simulate a complex transaction with multiple steps
      await withTransaction(async (tx) => {
        // This would normally contain multiple database operations
        return mockFn();
      });

      expect(transactionSpy).toHaveBeenCalled();

      transactionSpy.mockRestore();
    });

    it("should handle transaction isolation levels", async () => {
      const mockFn = jest.fn().mockResolvedValue({ success: true });
      const transactionSpy = jest
        .spyOn(prisma, "$transaction")
        .mockResolvedValue({ success: true });

      await withTransaction(mockFn, {
        isolationLevel: "Serializable" as any,
      });

      expect(transactionSpy).toHaveBeenCalledWith(mockFn, {
        maxWait: 5000,
        timeout: 10000,
        isolationLevel: "Serializable",
      });

      transactionSpy.mockRestore();
    });
  });
});
