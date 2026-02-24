import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // NextAuth
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(1),

  // OpenAI
  OPENAI_API_KEY: z.string().min(1),

  // Storage (at least one required)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),

  // Redis (optional)
  REDIS_URL: z.string().url().optional(),

  // Rate Limiting (optional, with defaults)
  RATE_LIMIT_IMAGE_GENERATION: z.string().optional().default("3"),
  RATE_LIMIT_AI_REQUESTS: z.string().optional().default("100"),

  // Application
  NEXT_PUBLIC_APP_URL: z.string().url(),

  // Feature Flags
  NEXT_PUBLIC_ENABLE_CINEMATIC_UI: z.string().optional().default("false"),

  // OAuth Providers (optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
});

function validateEnv() {
  // Skip validation during build time if no DATABASE_URL is set
  // This allows the build to succeed without all environment variables
  if (process.env.SKIP_ENV_VALIDATION === "true") {
    console.warn("⚠️  Skipping environment validation (SKIP_ENV_VALIDATION=true)");
    return {} as z.infer<typeof envSchema>;
  }

  try {
    const env = envSchema.parse(process.env);
    
    // Additional validation: ensure at least one storage provider is configured
    const hasAWS = env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.AWS_REGION && env.AWS_S3_BUCKET;
    const hasSupabase = env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!hasAWS && !hasSupabase) {
      throw new Error(
        "At least one storage provider must be configured (AWS S3 or Supabase Storage)"
      );
    }

    console.log("✅ Environment variables validated successfully");
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((err) => err.path.join("."));
      console.error("❌ Invalid environment variables:");
      console.error(error.errors);
      throw new Error(
        `Missing or invalid environment variables: ${missingVars.join(", ")}`
      );
    }
    throw error;
  }
}

// Validate on module load (startup)
export const env = validateEnv();

// Type-safe environment variables
export type Env = z.infer<typeof envSchema>;
