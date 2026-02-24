import { describe, it, expect } from "@jest/globals";
import {
  validateAction,
  generateRefusalMessage,
  ActionValidationResult,
} from "../action-validator";
import { PowerSheet } from "../../types";

describe("Action Validator", () => {
  // Sample Power Sheet for testing
  const samplePowerSheet: PowerSheet = {
    level: 3,
    hp: 80,
    maxHp: 100,
    attributes: {
      strength: 60,
      agility: 50,
      intelligence: 40,
      charisma: 30,
      endurance: 55,
    },
    abilities: [
      {
        name: "Fire Blast",
        description: "Launch a powerful fire attack at enemies",
        powerLevel: 6,
        cooldown: null,
      },
      {
        name: "Quick Strike",
        description: "A fast physical attack using agility",
        powerLevel: 4,
        cooldown: null,
      },
      {
        name: "Flame Shield",
        description: "Create a protective barrier of fire",
        powerLevel: 5,
        cooldown: 3,
      },
    ],
    weakness: "Weak to water and ice attacks",
    statuses: [],
    perks: [],
  };

  describe("validateAction", () => {
    describe("Valid Actions", () => {
      it("should accept actions that match character abilities", () => {
        const result = validateAction(
          "I use Fire Blast on the enemy",
          samplePowerSheet,
          "TestChar"
        );

        expect(result.valid).toBe(true);
        expect(result.reason).toContain("within character abilities");
      });

      it("should accept actions with ability keywords", () => {
        const result = validateAction(
          "I launch a fire attack",
          samplePowerSheet,
          "TestChar"
        );

        expect(result.valid).toBe(true);
      });

      it("should accept actions with thematic alignment", () => {
        const result = validateAction(
          "I create a wall of flames",
          samplePowerSheet,
          "TestChar"
        );

        expect(result.valid).toBe(true);
      });

      it("should accept physical actions when character has physical abilities", () => {
        const result = validateAction(
          "I strike the enemy quickly",
          samplePowerSheet,
          "TestChar"
        );

        expect(result.valid).toBe(true);
      });
    });

    describe("Empty Actions", () => {
      it("should reject empty actions", () => {
        const result = validateAction("", samplePowerSheet, "TestChar");

        expect(result.valid).toBe(false);
        expect(result.reason).toContain("cannot be empty");
        expect(result.suggestedAlternatives).toBeDefined();
        expect(result.suggestedAlternatives?.length).toBeGreaterThan(0);
      });

      it("should reject whitespace-only actions", () => {
        const result = validateAction("   ", samplePowerSheet, "TestChar");

        expect(result.valid).toBe(false);
        expect(result.reason).toContain("cannot be empty");
      });
    });

    describe("Power Scaling Validation", () => {
      it("should reject god mode actions - instantly kill", () => {
        const result = validateAction(
          "I instantly kill all enemies",
          samplePowerSheet,
          "TestChar"
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toContain("unreasonable power scaling");
        expect(result.reason).toContain("instantly kill");
      });

      it("should reject god mode actions - destroy everything", () => {
        const result = validateAction(
          "I destroy everything in sight",
          samplePowerSheet,
          "TestChar"
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toContain("unreasonable power scaling");
      });

      it("should reject god mode actions - become invincible", () => {
        const result = validateAction(
          "I become invincible",
          samplePowerSheet,
          "TestChar"
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toContain("unreasonable power scaling");
      });

      it("should reject god mode actions - infinite power", () => {
        const result = validateAction(
          "I gain infinite power",
          samplePowerSheet,
          "TestChar"
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toContain("unreasonable power scaling");
      });

      it("should reject god mode actions - omnipotent", () => {
        const result = validateAction(
          "I become omnipotent",
          samplePowerSheet,
          "TestChar"
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toContain("unreasonable power scaling");
      });

      it("should reject overpowered actions for low-level characters", () => {
        const lowLevelSheet: PowerSheet = {
          ...samplePowerSheet,
          level: 2,
          abilities: [
            {
              name: "Punch",
              description: "A basic physical attack",
              powerLevel: 2,
              cooldown: null,
            },
          ],
        };

        const result = validateAction(
          "I destroy the entire building",
          lowLevelSheet,
          "TestChar"
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toContain("level 2");
        expect(result.reason).toContain("too powerful");
      });

      it("should include power level in rejection message", () => {
        const result = validateAction(
          "I obliterate all existence",
          samplePowerSheet,
          "TestChar"
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toContain("6/10"); // Max power level
      });

      it("should provide ability alternatives for power scaling issues", () => {
        const result = validateAction(
          "I erase from existence",
          samplePowerSheet,
          "TestChar"
        );

        expect(result.valid).toBe(false);
        expect(result.suggestedAlternatives).toBeDefined();
        expect(result.suggestedAlternatives?.length).toBeGreaterThan(0);
      });
    });

    describe("Weakness Validation", () => {
      it("should reject actions that conflict with water weakness", () => {
        const result = validateAction(
          "I dive underwater to attack",
          samplePowerSheet,
          "TestChar"
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toContain("weakness");
        expect(result.reason).toContain("water");
      });

      it("should reject actions that conflict with ice weakness", () => {
        const result = validateAction(
          "I use ice magic",
          samplePowerSheet,
          "TestChar"
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toContain("weakness");
      });

      it("should reject swimming actions for water weakness", () => {
        const result = validateAction(
          "I swim across the river",
          samplePowerSheet,
          "TestChar"
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toContain("weakness to water");
      });

      it("should handle fire weakness", () => {
        const fireWeakSheet: PowerSheet = {
          ...samplePowerSheet,
          weakness: "Weak to fire",
        };

        const result = validateAction(
          "I ignite the area",
          fireWeakSheet,
          "TestChar"
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toContain("weakness to fire");
      });

      it("should handle magic weakness", () => {
        const magicWeakSheet: PowerSheet = {
          ...samplePowerSheet,
          weakness: "Cannot use magic",
          abilities: [
            {
              name: "Sword Strike",
              description: "A physical sword attack",
              powerLevel: 5,
              cooldown: null,
            },
          ],
        };

        const result = validateAction(
          "I cast a spell",
          magicWeakSheet,
          "TestChar"
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toContain("weakness related to magic");
      });

      it("should provide alternatives that avoid weakness", () => {
        const result = validateAction(
          "I swim underwater",
          samplePowerSheet,
          "TestChar"
        );

        expect(result.valid).toBe(false);
        expect(result.suggestedAlternatives).toBeDefined();
      });
    });

    describe("Ability Alignment Validation", () => {
      it("should reject actions completely outside character abilities", () => {
        const result = validateAction(
          "I hack into the computer system",
          samplePowerSheet,
          "TestChar"
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toContain("doesn't align with your character's abilities");
        expect(result.reason).toContain("Fire Blast");
      });

      it("should reject healing actions when character has no healing abilities", () => {
        const result = validateAction(
          "I heal my allies",
          samplePowerSheet,
          "TestChar"
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toContain("doesn't align");
      });

      it("should reject magic actions for non-magic characters", () => {
        const physicalSheet: PowerSheet = {
          ...samplePowerSheet,
          abilities: [
            {
              name: "Punch",
              description: "A strong physical punch",
              powerLevel: 5,
              cooldown: null,
            },
            {
              name: "Kick",
              description: "A powerful kick",
              powerLevel: 5,
              cooldown: null,
            },
          ],
        };

        const result = validateAction(
          "I cast a fireball spell",
          physicalSheet,
          "TestChar"
        );

        expect(result.valid).toBe(false);
      });

      it("should provide ability list in rejection message", () => {
        const result = validateAction(
          "I teleport away",
          samplePowerSheet,
          "TestChar"
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toContain("Fire Blast");
        expect(result.reason).toContain("Quick Strike");
        expect(result.reason).toContain("Flame Shield");
      });

      it("should suggest alternatives for misaligned actions", () => {
        const result = validateAction(
          "I summon a dragon",
          samplePowerSheet,
          "TestChar"
        );

        expect(result.valid).toBe(false);
        expect(result.suggestedAlternatives).toBeDefined();
        expect(result.suggestedAlternatives?.length).toBeGreaterThan(0);
      });
    });

    describe("Edge Cases", () => {
      it("should handle actions with mixed case", () => {
        const result = validateAction(
          "I USE FIRE BLAST",
          samplePowerSheet,
          "TestChar"
        );

        expect(result.valid).toBe(true);
      });

      it("should handle actions with extra whitespace", () => {
        const result = validateAction(
          "  I use fire blast  ",
          samplePowerSheet,
          "TestChar"
        );

        expect(result.valid).toBe(true);
      });

      it("should handle character with no abilities", () => {
        const noAbilitiesSheet: PowerSheet = {
          ...samplePowerSheet,
          abilities: [],
        };

        const result = validateAction(
          "I attack",
          noAbilitiesSheet,
          "TestChar"
        );

        expect(result.valid).toBe(false);
      });

      it("should handle very long action descriptions", () => {
        const longAction = "I use my fire blast ability to ".repeat(50);
        const result = validateAction(
          longAction,
          samplePowerSheet,
          "TestChar"
        );

        expect(result.valid).toBe(true);
      });
    });
  });

  describe("generateRefusalMessage", () => {
    it("should return empty string for valid actions", () => {
      const validResult: ActionValidationResult = {
        valid: true,
        reason: "Action is valid",
      };

      const message = generateRefusalMessage(validResult, "TestChar");

      expect(message).toBe("");
    });

    it("should generate refusal message with reason", () => {
      const invalidResult: ActionValidationResult = {
        valid: false,
        reason: "Action is too powerful",
      };

      const message = generateRefusalMessage(invalidResult, "TestChar");

      expect(message).toContain("Action Refused");
      expect(message).toContain("Action is too powerful");
      expect(message).toContain("TestChar");
    });

    it("should include suggested alternatives when provided", () => {
      const invalidResult: ActionValidationResult = {
        valid: false,
        reason: "Action doesn't match abilities",
        suggestedAlternatives: ["Fire Blast", "Quick Strike", "Flame Shield"],
      };

      const message = generateRefusalMessage(invalidResult, "TestChar");

      expect(message).toContain("Suggested alternatives");
      expect(message).toContain("1. Fire Blast");
      expect(message).toContain("2. Quick Strike");
      expect(message).toContain("3. Flame Shield");
    });

    it("should prompt for A-D choices or valid action", () => {
      const invalidResult: ActionValidationResult = {
        valid: false,
        reason: "Invalid action",
      };

      const message = generateRefusalMessage(invalidResult, "TestChar");

      expect(message).toContain("A-D choices");
      expect(message).toContain("valid action");
    });

    it("should handle results without alternatives", () => {
      const invalidResult: ActionValidationResult = {
        valid: false,
        reason: "Action is invalid",
        suggestedAlternatives: [],
      };

      const message = generateRefusalMessage(invalidResult, "TestChar");

      expect(message).toContain("Action Refused");
      expect(message).not.toContain("Suggested alternatives");
    });
  });
});
