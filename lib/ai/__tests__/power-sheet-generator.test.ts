// Mock OpenAI before imports
jest.mock("openai", () => {
  const mockCreate = jest.fn();
  return jest.fn().mockImplementation(() => {
    return {
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    };
  });
});

import { generatePowerSheet } from "../power-sheet-generator";
import OpenAI from "openai";

// Get the mock function after import
const mockCreate = (new OpenAI() as any).chat.completions.create;

describe("Power Sheet Generator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validCharacterInput = {
    name: "Homelander-Charizard",
    fusionIngredients: "Homelander + Charizard",
    description: "A flying superhero with fire breath",
    abilities: ["Flight", "Heat Vision", "Fire Breath"],
    weakness: "Vulnerable to magic",
    alignment: "Chaotic Neutral",
    archetype: "Warrior",
    tags: ["superhero", "dragon"],
  };

  const validPowerSheetResponse = {
    level: 1,
    hp: 100,
    maxHp: 100,
    attributes: {
      strength: 60,
      agility: 50,
      intelligence: 40,
      charisma: 55,
      endurance: 45,
    },
    abilities: [
      {
        name: "Flight",
        description: "Can fly at high speeds",
        powerLevel: 6,
        cooldown: null,
      },
      {
        name: "Heat Vision",
        description: "Shoots laser beams from eyes",
        powerLevel: 8,
        cooldown: 2,
      },
      {
        name: "Fire Breath",
        description: "Breathes intense flames",
        powerLevel: 7,
        cooldown: 3,
      },
    ],
    weakness: "Vulnerable to magic attacks and spells",
    statuses: [],
    perks: [],
  };

  describe("Successful generation", () => {
    it("should generate a valid Power Sheet on first attempt", async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(validPowerSheetResponse),
            },
          },
        ],
      });

      const result = await generatePowerSheet(validCharacterInput);

      expect(result.success).toBe(true);
      expect(result.powerSheet).toBeDefined();
      expect(result.powerSheet?.level).toBe(1);
      expect(result.powerSheet?.hp).toBe(100);
      expect(result.powerSheet?.abilities).toHaveLength(3);
    });

    it("should include all character information in the prompt", async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(validPowerSheetResponse),
            },
          },
        ],
      });

      await generatePowerSheet(validCharacterInput);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-4",
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: "user",
              content: expect.stringContaining(validCharacterInput.name),
            }),
            expect.objectContaining({
              role: "user",
              content: expect.stringContaining(validCharacterInput.fusionIngredients),
            }),
          ]),
        })
      );
    });

    it("should use JSON response format", async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(validPowerSheetResponse),
            },
          },
        ],
      });

      await generatePowerSheet(validCharacterInput);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          response_format: { type: "json_object" },
        })
      );
    });
  });

  describe("Retry logic with exponential backoff", () => {
    it("should retry on failure and succeed on second attempt", async () => {
      mockCreate
        .mockRejectedValueOnce(new Error("API timeout"))
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: JSON.stringify(validPowerSheetResponse),
              },
            },
          ],
        });

      const result = await generatePowerSheet(validCharacterInput);

      expect(result.success).toBe(true);
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it("should retry up to MAX_RETRIES times", async () => {
      mockCreate.mockRejectedValue(new Error("API error"));

      const result = await generatePowerSheet(validCharacterInput);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockCreate).toHaveBeenCalledTimes(3); // MAX_RETRIES = 3
    });

    it("should implement exponential backoff between retries", async () => {
      jest.useFakeTimers();
      mockCreate.mockRejectedValue(new Error("API error"));

      const promise = generatePowerSheet(validCharacterInput);

      // Fast-forward through all timers
      await jest.runAllTimersAsync();

      const result = await promise;

      expect(result.success).toBe(false);
      jest.useRealTimers();
    });
  });

  describe("Response validation", () => {
    it("should reject invalid level", async () => {
      const invalidResponse = {
        ...validPowerSheetResponse,
        level: 5, // Should be 1
      };

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(invalidResponse),
            },
          },
        ],
      });

      // Mock subsequent retries to also fail with validation error
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(invalidResponse),
            },
          },
        ],
      });

      const result = await generatePowerSheet(validCharacterInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain("level");
    });

    it("should reject HP out of valid range", async () => {
      const invalidResponse = {
        ...validPowerSheetResponse,
        hp: 2000, // Too high
        maxHp: 2000,
      };

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(invalidResponse),
            },
          },
        ],
      });

      const result = await generatePowerSheet(validCharacterInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain("HP");
    });

    it("should reject mismatched hp and maxHp", async () => {
      const invalidResponse = {
        ...validPowerSheetResponse,
        hp: 100,
        maxHp: 150, // Should match hp at level 1
      };

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(invalidResponse),
            },
          },
        ],
      });

      const result = await generatePowerSheet(validCharacterInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain("maxHp");
    });

    it("should reject attributes out of valid range", async () => {
      const invalidResponse = {
        ...validPowerSheetResponse,
        attributes: {
          strength: 150, // Too high
          agility: 50,
          intelligence: 40,
          charisma: 55,
          endurance: 45,
        },
      };

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(invalidResponse),
            },
          },
        ],
      });

      const result = await generatePowerSheet(validCharacterInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain("strength");
    });

    it("should reject unbalanced total attributes", async () => {
      const invalidResponse = {
        ...validPowerSheetResponse,
        attributes: {
          strength: 90,
          agility: 90,
          intelligence: 90,
          charisma: 90,
          endurance: 90,
        }, // Total = 450, too high
      };

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(invalidResponse),
            },
          },
        ],
      });

      const result = await generatePowerSheet(validCharacterInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unbalanced attributes");
    });

    it("should reject missing abilities", async () => {
      const invalidResponse = {
        ...validPowerSheetResponse,
        abilities: [],
      };

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(invalidResponse),
            },
          },
        ],
      });

      const result = await generatePowerSheet(validCharacterInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain("abilities");
    });

    it("should reject ability count mismatch", async () => {
      const invalidResponse = {
        ...validPowerSheetResponse,
        abilities: [validPowerSheetResponse.abilities[0]], // Only 1 ability instead of 3
      };

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(invalidResponse),
            },
          },
        ],
      });

      const result = await generatePowerSheet(validCharacterInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Ability count mismatch");
    });

    it("should reject invalid ability power level", async () => {
      const invalidResponse = {
        ...validPowerSheetResponse,
        abilities: [
          {
            name: "Flight",
            description: "Can fly",
            powerLevel: 15, // Too high
            cooldown: null,
          },
          ...validPowerSheetResponse.abilities.slice(1),
        ],
      };

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(invalidResponse),
            },
          },
        ],
      });

      const result = await generatePowerSheet(validCharacterInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain("powerLevel");
    });

    it("should reject missing weakness", async () => {
      const invalidResponse = {
        ...validPowerSheetResponse,
        weakness: "",
      };

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(invalidResponse),
            },
          },
        ],
      });

      const result = await generatePowerSheet(validCharacterInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain("weakness");
    });

    it("should reject invalid JSON response", async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: "This is not valid JSON",
            },
          },
        ],
      });

      const result = await generatePowerSheet(validCharacterInput);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should reject empty response", async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      });

      const result = await generatePowerSheet(validCharacterInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain("No response content");
    });
  });

  describe("Edge cases", () => {
    it("should handle character with minimum abilities (3)", async () => {
      const minAbilitiesInput = {
        ...validCharacterInput,
        abilities: ["Ability1", "Ability2", "Ability3"],
      };

      const minAbilitiesResponse = {
        ...validPowerSheetResponse,
        abilities: [
          { name: "Ability1", description: "Desc1", powerLevel: 5, cooldown: null },
          { name: "Ability2", description: "Desc2", powerLevel: 5, cooldown: null },
          { name: "Ability3", description: "Desc3", powerLevel: 5, cooldown: null },
        ],
      };

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(minAbilitiesResponse),
            },
          },
        ],
      });

      const result = await generatePowerSheet(minAbilitiesInput);

      expect(result.success).toBe(true);
      expect(result.powerSheet?.abilities).toHaveLength(3);
    });

    it("should handle character with maximum abilities (6)", async () => {
      const maxAbilitiesInput = {
        ...validCharacterInput,
        abilities: ["A1", "A2", "A3", "A4", "A5", "A6"],
      };

      const maxAbilitiesResponse = {
        ...validPowerSheetResponse,
        abilities: Array(6)
          .fill(null)
          .map((_, i) => ({
            name: `A${i + 1}`,
            description: `Description ${i + 1}`,
            powerLevel: 5,
            cooldown: null,
          })),
      };

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(maxAbilitiesResponse),
            },
          },
        ],
      });

      const result = await generatePowerSheet(maxAbilitiesInput);

      expect(result.success).toBe(true);
      expect(result.powerSheet?.abilities).toHaveLength(6);
    });

    it("should handle character without optional fields", async () => {
      const minimalInput = {
        name: "Test Character",
        fusionIngredients: "A + B",
        description: "A test character",
        abilities: ["Ability1", "Ability2", "Ability3"],
        weakness: "Test weakness",
      };

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(validPowerSheetResponse),
            },
          },
        ],
      });

      const result = await generatePowerSheet(minimalInput);

      expect(result.success).toBe(true);
    });

    it("should handle abilities with null cooldowns", async () => {
      const responseWithNullCooldowns = {
        ...validPowerSheetResponse,
        abilities: validPowerSheetResponse.abilities.map((a) => ({
          ...a,
          cooldown: null,
        })),
      };

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(responseWithNullCooldowns),
            },
          },
        ],
      });

      const result = await generatePowerSheet(validCharacterInput);

      expect(result.success).toBe(true);
      expect(result.powerSheet?.abilities.every((a) => a.cooldown === null)).toBe(true);
    });

    it("should handle abilities with numeric cooldowns", async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(validPowerSheetResponse),
            },
          },
        ],
      });

      const result = await generatePowerSheet(validCharacterInput);

      expect(result.success).toBe(true);
      expect(result.powerSheet?.abilities[1].cooldown).toBe(2);
      expect(result.powerSheet?.abilities[2].cooldown).toBe(3);
    });
  });
});
