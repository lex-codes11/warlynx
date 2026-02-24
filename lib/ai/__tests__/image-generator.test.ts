import { generateCharacterImage } from "../image-generator";

// Mock OpenAI at the top level
jest.mock("openai", () => {
  const mockGenerate = jest.fn();
  return jest.fn().mockImplementation(() => ({
    images: {
      generate: mockGenerate,
    },
  }));
});

// Mock crypto
jest.mock("crypto", () => ({
  randomBytes: jest.fn(() => ({
    toString: () => "abc123def456",
  })),
}));

// Mock dynamic imports
jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  PutObjectCommand: jest.fn(),
}));

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn().mockReturnValue({
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: { path: "characters/test.png" },
          error: null,
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: "https://test.supabase.co/storage/v1/object/public/character-images/characters/test.png" },
        }),
      }),
    },
  }),
}));

// Mock fetch
global.fetch = jest.fn();

// Get reference to the mocked generate function
let mockGenerate: jest.Mock;

describe("generateCharacterImage", () => {
  const mockCharacter = {
    name: "Test Character",
    fusionIngredients: "Goku + Pikachu",
    description: "A powerful warrior with electric abilities",
    alignment: "Chaotic Good",
    archetype: "Warrior",
    tags: ["anime", "pokemon"],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-key";
    
    // Get the mock generate function from the OpenAI mock
    const OpenAI = require("openai");
    const openaiInstance = new OpenAI();
    mockGenerate = openaiInstance.images.generate as jest.Mock;
    
    // Default fetch mock
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      arrayBuffer: jest.fn().mockResolvedValue(Buffer.from("test-image-data").buffer),
    });
  });

  describe("with S3 storage", () => {
    beforeEach(() => {
      process.env.AWS_ACCESS_KEY_ID = "test-access-key";
      process.env.AWS_SECRET_ACCESS_KEY = "test-secret-key";
      process.env.AWS_REGION = "us-east-1";
      process.env.AWS_S3_BUCKET = "test-bucket";
      
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    });

    it("should generate image and upload to S3 successfully", async () => {
      mockGenerate.mockResolvedValue({
        data: [{ url: "https://oaidalleapiprodscus.blob.core.windows.net/test.png" }],
      });

      const result = await generateCharacterImage(mockCharacter);

      expect(result.success).toBe(true);
      expect(result.imageUrl).toContain("test-bucket.s3.us-east-1.amazonaws.com");
      expect(result.imageUrl).toContain("characters/test-character-");
      expect(result.imagePrompt).toContain("Test Character");
      expect(result.imagePrompt).toContain("Goku + Pikachu");
      expect(result.imagePrompt).toContain("powerful warrior with electric abilities");

      expect(mockGenerate).toHaveBeenCalledWith({
        model: "dall-e-3",
        prompt: expect.stringContaining("Test Character"),
        n: 1,
        size: "1024x1024",
        quality: "standard",
        style: "vivid",
      });
    });

    it("should include all character details in prompt", async () => {
      mockGenerate.mockResolvedValue({
        data: [{ url: "https://test.com/image.png" }],
      });

      const result = await generateCharacterImage(mockCharacter);

      expect(result.success).toBe(true);
      expect(result.imagePrompt).toContain("Test Character");
      expect(result.imagePrompt).toContain("Goku + Pikachu");
      expect(result.imagePrompt).toContain("powerful warrior with electric abilities");
      expect(result.imagePrompt).toContain("Warrior");
      expect(result.imagePrompt).toContain("Chaotic Good");
      expect(result.imagePrompt).toContain("anime, pokemon");
      expect(result.imagePrompt).toContain("High quality digital art");
    });

    it("should handle optional fields gracefully", async () => {
      const minimalCharacter = {
        name: "Simple Character",
        fusionIngredients: "Batman + Wolverine",
        description: "A dark vigilante with claws",
      };

      mockGenerate.mockResolvedValue({
        data: [{ url: "https://test.com/image.png" }],
      });

      const result = await generateCharacterImage(minimalCharacter);

      expect(result.success).toBe(true);
      expect(result.imagePrompt).toContain("Simple Character");
      expect(result.imagePrompt).toContain("Batman + Wolverine");
      expect(result.imagePrompt).not.toContain("archetype");
      expect(result.imagePrompt).not.toContain("alignment");
    });
  });

  describe("with Supabase storage", () => {
    beforeEach(() => {
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_SECRET_ACCESS_KEY;
      delete process.env.AWS_REGION;
      delete process.env.AWS_S3_BUCKET;
      
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
    });

    it("should generate image and upload to Supabase successfully", async () => {
      mockGenerate.mockResolvedValue({
        data: [{ url: "https://oaidalleapiprodscus.blob.core.windows.net/test.png" }],
      });

      const result = await generateCharacterImage(mockCharacter);

      expect(result.success).toBe(true);
      expect(result.imageUrl).toContain("supabase.co");
      expect(result.imageUrl).toContain("character-images");
      expect(result.imagePrompt).toContain("Test Character");
    });
  });

  describe("error handling", () => {
    beforeEach(() => {
      process.env.AWS_ACCESS_KEY_ID = "test-access-key";
      process.env.AWS_SECRET_ACCESS_KEY = "test-secret-key";
      process.env.AWS_REGION = "us-east-1";
      process.env.AWS_S3_BUCKET = "test-bucket";
    });

    it("should return error when no storage provider is configured", async () => {
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_SECRET_ACCESS_KEY;
      delete process.env.AWS_REGION;
      delete process.env.AWS_S3_BUCKET;
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const result = await generateCharacterImage(mockCharacter);

      expect(result.success).toBe(false);
      expect(result.error).toContain("No storage provider configured");
    });

    it("should handle OpenAI API errors", async () => {
      mockGenerate.mockRejectedValue(new Error("OpenAI API rate limit exceeded"));

      const result = await generateCharacterImage(mockCharacter);

      expect(result.success).toBe(false);
      expect(result.error).toContain("OpenAI API rate limit exceeded");
    });

    it("should handle missing image URL in OpenAI response", async () => {
      mockGenerate.mockResolvedValue({
        data: [],
      });

      const result = await generateCharacterImage(mockCharacter);

      expect(result.success).toBe(false);
      expect(result.error).toContain("No image URL returned");
    });

    it("should handle image download failures", async () => {
      mockGenerate.mockResolvedValue({
        data: [{ url: "https://test.com/image.png" }],
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: "Not Found",
      });

      const result = await generateCharacterImage(mockCharacter);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to download image");
    });

    it("should retry on failures with exponential backoff", async () => {
      mockGenerate
        .mockRejectedValueOnce(new Error("Temporary error"))
        .mockRejectedValueOnce(new Error("Temporary error"))
        .mockResolvedValueOnce({
          data: [{ url: "https://test.com/image.png" }],
        });

      const result = await generateCharacterImage(mockCharacter);

      expect(result.success).toBe(true);
      expect(mockGenerate).toHaveBeenCalledTimes(3);
    });

    it("should fail after max retries", async () => {
      mockGenerate.mockRejectedValue(new Error("Persistent error"));

      const result = await generateCharacterImage(mockCharacter);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Persistent error");
      expect(mockGenerate).toHaveBeenCalledTimes(3);
    });
  });

  describe("filename generation", () => {
    beforeEach(() => {
      process.env.AWS_ACCESS_KEY_ID = "test-access-key";
      process.env.AWS_SECRET_ACCESS_KEY = "test-secret-key";
      process.env.AWS_REGION = "us-east-1";
      process.env.AWS_S3_BUCKET = "test-bucket";
    });

    it("should sanitize character names in filenames", async () => {
      const characterWithSpecialChars = {
        ...mockCharacter,
        name: "Test Character!@#$%^&*() With Spaces",
      };

      mockGenerate.mockResolvedValue({
        data: [{ url: "https://test.com/image.png" }],
      });

      const result = await generateCharacterImage(characterWithSpecialChars);

      expect(result.success).toBe(true);
      expect(result.imageUrl).toContain("test-character");
      expect(result.imageUrl).not.toContain("!");
      expect(result.imageUrl).not.toContain("@");
      expect(result.imageUrl).not.toContain(" ");
    });

    it("should include timestamp and random suffix for uniqueness", async () => {
      mockGenerate.mockResolvedValue({
        data: [{ url: "https://test.com/image.png" }],
      });

      const result = await generateCharacterImage(mockCharacter);

      expect(result.success).toBe(true);
      expect(result.imageUrl).toMatch(/characters\/test-character-\d+-abc123def456\.png/);
    });
  });
});
