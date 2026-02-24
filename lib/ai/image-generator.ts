import OpenAI from "openai";
import { randomBytes } from "crypto";
import {
  sanitizeCharacterName,
  sanitizeDescription,
  sanitizeFusionIngredients,
  sanitizeAbility,
} from "../sanitize";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configuration for retry logic
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const BACKOFF_MULTIPLIER = 2;

interface CharacterImageInput {
  name: string;
  fusionIngredients: string;
  description: string;
  alignment?: string | null;
  archetype?: string | null;
  tags?: string[];
}

interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  imagePrompt?: string;
  error?: string;
}

/**
 * Determine which storage provider is configured
 */
function getStorageType(): "s3" | "supabase" | null {
  const hasAWS =
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_REGION &&
    process.env.AWS_S3_BUCKET;

  const hasSupabase =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (hasAWS) return "s3";
  if (hasSupabase) return "supabase";
  return null;
}

/**
 * Generate a character image using DALL-E 3
 * Implements retry logic with exponential backoff
 * 
 * **Validates: Requirements 4.5, 4.6, 12.1, 12.2, 12.3**
 */
export async function generateCharacterImage(
  character: CharacterImageInput
): Promise<ImageGenerationResult> {
  const storageType = getStorageType();
  
  if (!storageType) {
    return {
      success: false,
      error: "No storage provider configured. Please configure AWS S3 or Supabase Storage.",
    };
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await attemptImageGeneration(character, storageType);
      return result;
    } catch (error) {
      lastError = error as Error;
      console.error(
        `Image generation attempt ${attempt + 1} failed:`,
        error
      );

      // If this isn't the last attempt, wait before retrying
      if (attempt < MAX_RETRIES - 1) {
        const backoffTime =
          INITIAL_BACKOFF_MS * Math.pow(BACKOFF_MULTIPLIER, attempt);
        console.log(`Retrying in ${backoffTime}ms...`);
        await sleep(backoffTime);
      }
    }
  }

  return {
    success: false,
    error:
      lastError?.message ||
      "Failed to generate character image after multiple attempts",
  };
}

/**
 * Single attempt to generate and upload a character image
 */
async function attemptImageGeneration(
  character: CharacterImageInput,
  storageType: "s3" | "supabase"
): Promise<ImageGenerationResult> {
  // Build the image prompt using consistent template
  const imagePrompt = buildImagePrompt(character);

  // Generate image with DALL-E 3
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: imagePrompt,
    n: 1,
    size: "1024x1024",
    quality: "standard",
    style: "vivid",
  });

  const imageUrl = response.data?.[0]?.url;
  if (!imageUrl) {
    throw new Error("No image URL returned from DALL-E");
  }

  // Download the image from OpenAI's temporary URL
  const imageBuffer = await downloadImage(imageUrl);

  // Upload to configured storage provider
  const storedImageUrl = await uploadImage(imageBuffer, character.name, storageType);

  return {
    success: true,
    imageUrl: storedImageUrl,
    imagePrompt,
  };
}

/**
 * Build the DALL-E prompt using consistent template
 * Sanitizes all user inputs before including in prompt
 * 
 * **Validates: Requirement 12.1** - Consistent prompt template based on Fusion_Ingredients and description
 */
function buildImagePrompt(character: CharacterImageInput): string {
  // Sanitize all user inputs to prevent prompt injection
  const sanitizedName = sanitizeCharacterName(character.name).sanitized;
  const sanitizedFusion = sanitizeFusionIngredients(character.fusionIngredients).sanitized;
  const sanitizedDescription = sanitizeDescription(character.description).sanitized;
  const sanitizedArchetype = character.archetype ? sanitizeAbility(character.archetype).sanitized : null;
  const sanitizedAlignment = character.alignment ? sanitizeAbility(character.alignment).sanitized : null;
  const sanitizedTags = character.tags?.map(t => sanitizeAbility(t).sanitized) || [];

  const parts: string[] = [];

  // Core prompt structure
  parts.push(
    `A detailed character portrait of ${sanitizedName}, a fusion of ${sanitizedFusion}.`
  );

  // Add description
  parts.push(sanitizedDescription);

  // Add archetype if provided
  if (sanitizedArchetype) {
    parts.push(`Character archetype: ${sanitizedArchetype}.`);
  }

  // Add alignment if provided
  if (sanitizedAlignment) {
    parts.push(`Alignment: ${sanitizedAlignment}.`);
  }

  // Add tags for style guidance
  if (sanitizedTags.length > 0) {
    parts.push(`Style influences: ${sanitizedTags.join(", ")}.`);
  }

  // Add consistent style instructions
  parts.push(
    "High quality digital art, dramatic lighting, dynamic pose, detailed features, fantasy game character design."
  );

  return parts.join(" ");
}

/**
 * Download image from URL to buffer
 */
async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Upload image to configured storage provider
 * 
 * **Validates: Requirement 12.2** - Store image file and return URL
 */
async function uploadImage(
  imageBuffer: Buffer,
  characterName: string,
  storageType: "s3" | "supabase"
): Promise<string> {
  // Generate unique filename
  const timestamp = Date.now();
  const randomSuffix = randomBytes(8).toString("hex");
  const sanitizedName = characterName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .substring(0, 50);
  const filename = `characters/${sanitizedName}-${timestamp}-${randomSuffix}.png`;

  if (storageType === "s3") {
    return uploadToS3(imageBuffer, filename);
  } else {
    return uploadToSupabase(imageBuffer, filename);
  }
}

/**
 * Upload image to AWS S3
 */
async function uploadToS3(
  imageBuffer: Buffer,
  filename: string
): Promise<string> {
  // Lazy load AWS SDK to avoid issues in test environment
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  
  const s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  const bucket = process.env.AWS_S3_BUCKET!;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: filename,
    Body: imageBuffer,
    ContentType: "image/png",
    ACL: "public-read",
  });

  await s3Client.send(command);

  // Construct public URL
  const region = process.env.AWS_REGION!;
  return `https://${bucket}.s3.${region}.amazonaws.com/${filename}`;
}

/**
 * Upload image to Supabase Storage
 */
async function uploadToSupabase(
  imageBuffer: Buffer,
  filename: string
): Promise<string> {
  // Lazy load Supabase client to avoid issues in test environment
  const { createClient } = await import("@supabase/supabase-js");
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase.storage
    .from("character-images")
    .upload(filename, imageBuffer, {
      contentType: "image/png",
      upsert: false,
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("character-images")
    .getPublicUrl(filename);

  return urlData.publicUrl;
}

/**
 * Sleep utility for exponential backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
