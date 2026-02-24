import { PowerSheet } from "../types";

/**
 * Action Validator
 * 
 * Validates player actions against their Power Sheet to ensure:
 * - Actions are within character abilities
 * - Power scaling is reasonable
 * - Character weaknesses are respected
 * 
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**
 */

export interface ActionValidationResult {
  valid: boolean;
  reason: string;
  suggestedAlternatives?: string[];
}

/**
 * Validate a player action against their Power Sheet
 * 
 * @param action - The action the player wants to perform
 * @param powerSheet - The character's Power Sheet
 * @param characterName - The character's name (for context)
 * @returns Validation result with reason and optional alternatives
 */
export function validateAction(
  action: string,
  powerSheet: PowerSheet,
  characterName: string
): ActionValidationResult {
  // Normalize action for comparison
  const normalizedAction = action.toLowerCase().trim();

  // Check if action is empty
  if (!normalizedAction) {
    return {
      valid: false,
      reason: "Action cannot be empty. Please describe what you want to do.",
      suggestedAlternatives: powerSheet.abilities.slice(0, 3).map(a => a.name),
    };
  }

  // Check for unreasonable power scaling keywords
  const powerScalingIssue = checkPowerScaling(normalizedAction, powerSheet);
  if (powerScalingIssue) {
    return powerScalingIssue;
  }

  // Check if action conflicts with character weakness
  const weaknessIssue = checkWeaknessConflict(normalizedAction, powerSheet, characterName);
  if (weaknessIssue) {
    return weaknessIssue;
  }

  // Check if action is within character abilities
  const abilityCheck = checkAbilityAlignment(normalizedAction, powerSheet);
  if (!abilityCheck.valid) {
    return abilityCheck;
  }

  // Action is valid
  return {
    valid: true,
    reason: "Action is within character abilities and power level.",
  };
}

/**
 * Check for unreasonable power scaling in the action
 */
function checkPowerScaling(
  normalizedAction: string,
  powerSheet: PowerSheet
): ActionValidationResult | null {
  // Keywords that indicate unreasonable power scaling
  const godModeKeywords = [
    "instantly kill",
    "destroy everything",
    "become invincible",
    "infinite power",
    "omnipotent",
    "god mode",
    "one shot",
    "obliterate all",
    "erase from existence",
    "reality warp",
    "time stop",
    "rewrite reality",
  ];

  // Check for god mode keywords
  for (const keyword of godModeKeywords) {
    if (normalizedAction.includes(keyword)) {
      return {
        valid: false,
        reason: `The action "${normalizedAction}" involves unreasonable power scaling (${keyword}). Your character's maximum power level is ${Math.max(...powerSheet.abilities.map(a => a.powerLevel))}/10. Please choose an action that matches your character's capabilities.`,
        suggestedAlternatives: powerSheet.abilities
          .sort((a, b) => b.powerLevel - a.powerLevel)
          .slice(0, 3)
          .map(a => a.name),
      };
    }
  }

  // Check for power level mismatches based on character level
  const maxPowerLevel = Math.max(...powerSheet.abilities.map(a => a.powerLevel));
  
  // Low-level characters shouldn't perform high-level feats
  if (powerSheet.level < 5 && normalizedAction.match(/destroy|annihilate|devastate|massacre/)) {
    return {
      valid: false,
      reason: `Your character is only level ${powerSheet.level} with a maximum power level of ${maxPowerLevel}/10. The action seems too powerful for your current capabilities. Try something more appropriate to your level.`,
      suggestedAlternatives: powerSheet.abilities.slice(0, 3).map(a => a.name),
    };
  }

  return null;
}

/**
 * Check if action conflicts with character weakness
 */
function checkWeaknessConflict(
  normalizedAction: string,
  powerSheet: PowerSheet,
  characterName: string
): ActionValidationResult | null {
  const weakness = powerSheet.weakness.toLowerCase();

  // Extract key weakness terms
  const weaknessTerms = extractWeaknessTerms(weakness);

  // Check if action directly conflicts with weakness
  for (const term of weaknessTerms) {
    if (normalizedAction.includes(term)) {
      return {
        valid: false,
        reason: `${characterName} has a weakness: "${powerSheet.weakness}". The action conflicts with this weakness. Please choose an action that doesn't involve ${term}.`,
        suggestedAlternatives: powerSheet.abilities
          .filter(a => !a.name.toLowerCase().includes(term))
          .slice(0, 3)
          .map(a => a.name),
      };
    }
  }

  // Check for specific weakness patterns
  if (weakness.includes("water") && normalizedAction.match(/swim|dive|underwater/)) {
    return {
      valid: false,
      reason: `${characterName} has a weakness to water. This action would put them in a vulnerable position.`,
      suggestedAlternatives: powerSheet.abilities.slice(0, 3).map(a => a.name),
    };
  }

  if (weakness.includes("fire") && normalizedAction.match(/burn|flame|ignite/)) {
    return {
      valid: false,
      reason: `${characterName} has a weakness to fire. This action would be dangerous or impossible.`,
      suggestedAlternatives: powerSheet.abilities.slice(0, 3).map(a => a.name),
    };
  }

  if (weakness.includes("magic") && normalizedAction.match(/spell|enchant|magical/)) {
    return {
      valid: false,
      reason: `${characterName} has a weakness related to magic. This action conflicts with that limitation.`,
      suggestedAlternatives: powerSheet.abilities
        .filter(a => !a.description.toLowerCase().includes("magic"))
        .slice(0, 3)
        .map(a => a.name),
    };
  }

  return null;
}

/**
 * Check if action aligns with character abilities
 */
function checkAbilityAlignment(
  normalizedAction: string,
  powerSheet: PowerSheet
): ActionValidationResult {
  // Extract ability keywords
  const abilityKeywords = powerSheet.abilities.flatMap(ability => 
    extractAbilityKeywords(ability.name, ability.description)
  );

  // Check if action contains any ability-related keywords
  const hasAbilityMatch = abilityKeywords.some(keyword => 
    normalizedAction.includes(keyword.toLowerCase())
  );

  // If no direct match, check for thematic alignment
  if (!hasAbilityMatch) {
    const thematicMatch = checkThematicAlignment(normalizedAction, powerSheet);
    if (!thematicMatch) {
      return {
        valid: false,
        reason: `The action "${normalizedAction}" doesn't align with your character's abilities. Your abilities are: ${powerSheet.abilities.map(a => a.name).join(", ")}. Please choose an action that uses one of these abilities.`,
        suggestedAlternatives: powerSheet.abilities.slice(0, 3).map(a => a.name),
      };
    }
  }

  return {
    valid: true,
    reason: "Action aligns with character abilities.",
  };
}

/**
 * Extract key terms from weakness description
 */
function extractWeaknessTerms(weakness: string): string[] {
  const terms: string[] = [];
  
  // Common weakness patterns
  const patterns = [
    /weak(?:ness)? (?:to|against) (\w+)/gi,
    /vulnerable (?:to|against) (\w+)/gi,
    /cannot (\w+)/gi,
    /unable to (\w+)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(weakness)) !== null) {
      if (match[1]) {
        terms.push(match[1].toLowerCase());
      }
    }
  }

  // Also include direct mentions of common weakness types
  const commonWeaknesses = ["water", "fire", "ice", "magic", "physical", "mental", "dark", "light"];
  for (const common of commonWeaknesses) {
    if (weakness.includes(common)) {
      terms.push(common);
    }
  }

  return terms;
}

/**
 * Extract keywords from ability name and description
 */
function extractAbilityKeywords(name: string, description: string): string[] {
  const keywords: string[] = [];
  
  // Add ability name words
  keywords.push(...name.toLowerCase().split(/\s+/));
  
  // Extract key action verbs from description
  const actionVerbs = description.match(/\b(attack|defend|heal|buff|debuff|summon|cast|strike|blast|shield|protect|enhance|weaken|fly|teleport|transform|create|destroy)\b/gi);
  if (actionVerbs) {
    keywords.push(...actionVerbs.map(v => v.toLowerCase()));
  }

  return keywords;
}

/**
 * Check if action has thematic alignment with character abilities
 * This is a more lenient check for creative actions
 */
function checkThematicAlignment(
  normalizedAction: string,
  powerSheet: PowerSheet
): boolean {
  // Get ability themes
  const themes = powerSheet.abilities.map(a => {
    const desc = a.description.toLowerCase();
    if (desc.includes("fire") || desc.includes("flame")) return "fire";
    if (desc.includes("ice") || desc.includes("frost")) return "ice";
    if (desc.includes("lightning") || desc.includes("electric")) return "electric";
    if (desc.includes("physical") || desc.includes("strength")) return "physical";
    if (desc.includes("magic") || desc.includes("spell")) return "magic";
    if (desc.includes("heal") || desc.includes("restore")) return "healing";
    if (desc.includes("speed") || desc.includes("agility")) return "speed";
    if (desc.includes("mental") || desc.includes("psychic")) return "mental";
    return null;
  }).filter(Boolean);

  // Check if action matches any theme
  return themes.some(theme => normalizedAction.includes(theme as string));
}

/**
 * Generate a refusal message for an invalid action
 * 
 * @param validationResult - The validation result
 * @param characterName - The character's name
 * @returns A formatted refusal message
 */
export function generateRefusalMessage(
  validationResult: ActionValidationResult,
  characterName: string
): string {
  if (validationResult.valid) {
    return "";
  }

  let message = `**Action Refused**\n\n${validationResult.reason}`;

  if (validationResult.suggestedAlternatives && validationResult.suggestedAlternatives.length > 0) {
    message += `\n\n**Suggested alternatives:**\n${validationResult.suggestedAlternatives.map((alt, i) => `${i + 1}. ${alt}`).join("\n")}`;
  }

  message += `\n\nPlease select one of the A-D choices or submit a valid action that aligns with ${characterName}'s abilities.`;

  return message;
}
