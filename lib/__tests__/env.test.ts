/**
 * Environment Variable Validation Tests
 * 
 * These tests verify that the environment validation system correctly
 * identifies missing or invalid environment variables on startup.
 * 
 * Validates: Requirement 18.5
 */

describe('Environment Variable Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  it('should throw error when DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;
    
    expect(() => {
      jest.isolateModules(() => {
        require('../env');
      });
    }).toThrow(/DATABASE_URL/);
  });

  it('should throw error when NEXTAUTH_SECRET is missing', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    delete process.env.NEXTAUTH_SECRET;
    
    expect(() => {
      jest.isolateModules(() => {
        require('../env');
      });
    }).toThrow(/NEXTAUTH_SECRET/);
  });

  it('should throw error when OPENAI_API_KEY is missing', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.NEXTAUTH_SECRET = 'test-secret';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    delete process.env.OPENAI_API_KEY;
    
    expect(() => {
      jest.isolateModules(() => {
        require('../env');
      });
    }).toThrow(/OPENAI_API_KEY/);
  });

  it('should throw error when no storage provider is configured', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.NEXTAUTH_SECRET = 'test-secret';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    
    // Remove all storage provider variables
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_REGION;
    delete process.env.AWS_S3_BUCKET;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    expect(() => {
      jest.isolateModules(() => {
        require('../env');
      });
    }).toThrow(/storage provider/);
  });

  it('should pass validation with AWS S3 storage configured', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.NEXTAUTH_SECRET = 'test-secret';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    process.env.AWS_ACCESS_KEY_ID = 'test-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
    process.env.AWS_REGION = 'us-east-1';
    process.env.AWS_S3_BUCKET = 'test-bucket';
    
    expect(() => {
      jest.isolateModules(() => {
        require('../env');
      });
    }).not.toThrow();
  });

  it('should pass validation with Supabase storage configured', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.NEXTAUTH_SECRET = 'test-secret';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    
    expect(() => {
      jest.isolateModules(() => {
        require('../env');
      });
    }).not.toThrow();
  });
});
