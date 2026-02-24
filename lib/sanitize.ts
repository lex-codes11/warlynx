/**
 * Input Sanitization Module
 * 
 * Provides utilities for sanitizing user inputs before they're sent to AI models
 * to prevent prompt injection attacks and ensure safe AI interactions.
 * 
 * **Validates: Requirement 13.6** - Sanitize all user inputs to prevent prompt injection attacks
 */

/**
 * Maximum allowed length for user inputs
 */
const MAX_INPUT_LENGTH = 5000;

/**
 * Patterns that indicate potential prompt injection attempts
 */
const INJECTION_PATTERNS = [
  // System role manipulation
  /system\s*:/gi,
  /\[system\]/gi,
  /\<system\>/gi,
  
  // Role switching attempts
  /\bignore\s+(all\s+)?(previous|all|above)\s+(instructions?|prompts?|commands?)/gi,
  /\bdisregard\s+(all\s+)?(previous|all|above)\s+(instructions?|prompts?|commands?)/gi,
  /\bforget\s+(all\s+)?(previous|all|above)\s+(instructions?|prompts?|commands?)/gi,
  
  // Direct instruction injection
  /\byou\s+are\s+now\b/gi,
  /\bnew\s+instructions?\b/gi,
  /\boverride\s+instructions?\b/gi,
  /\bact\s+as\s+if\b/gi,
  
  // Prompt leaking attempts
  /\bshow\s+(me\s+)?(your|the)\s+(prompt|instructions?|system)/gi,
  /\bwhat\s+(is|are)\s+(your|the)\s+(prompt|instructions?|system)/gi,
  /\breveal\s+(your|the)\s+(prompt|instructions?|system)/gi,
  
  // JSON/XML injection
  /\{\s*"role"\s*:\s*"system"/gi,
  /\<role\>system\<\/role\>/gi,
  
  // Delimiter manipulation
  /---\s*end\s+of\s+(prompt|instructions?)/gi,
  /\*\*\*\s*end\s+of\s+(prompt|instructions?)/gi,
];

/**
 * Characters that should be escaped or removed to prevent injection
 */
const DANGEROUS_CHARS = [
  '\u0000', // Null byte
  '\u0001', // Start of heading
  '\u0002', // Start of text
  '\u0003', // End of text
  '\u0004', // End of transmission
  '\u0005', // Enquiry
  '\u0006', // Acknowledge
  '\u0007', // Bell
  '\u0008', // Backspace
  '\u000B', // Vertical tab
  '\u000C', // Form feed
  '\u000E', // Shift out
  '\u000F', // Shift in
];

/**
 * Sanitization result
 */
export interface SanitizationResult {
  sanitized: string;
  wasModified: boolean;
  warnings: string[];
}

/**
 * Sanitize user input before including it in AI prompts
 * 
 * This function:
 * - Removes dangerous control characters
 * - Detects and neutralizes prompt injection attempts
 * - Enforces length limits
 * - Normalizes whitespace
 * - Escapes special characters
 * 
 * @param input - The user input to sanitize
 * @param options - Optional configuration
 * @returns Sanitization result with sanitized text and warnings
 */
export function sanitizeInput(
  input: string,
  options: {
    maxLength?: number;
    allowNewlines?: boolean;
    strictMode?: boolean;
  } = {}
): SanitizationResult {
  const {
    maxLength = MAX_INPUT_LENGTH,
    allowNewlines = true,
    strictMode = false,
  } = options;

  const warnings: string[] = [];
  let sanitized = input;
  let wasModified = false;

  // Check for null or undefined
  if (input == null) {
    return {
      sanitized: '',
      wasModified: true,
      warnings: ['Input was null or undefined'],
    };
  }

  // Convert to string if not already
  if (typeof sanitized !== 'string') {
    sanitized = String(sanitized);
    wasModified = true;
    warnings.push('Input was converted to string');
  }

  // Enforce length limit
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
    wasModified = true;
    warnings.push(`Input was truncated to ${maxLength} characters`);
  }

  // Remove dangerous control characters
  const originalLength = sanitized.length;
  sanitized = removeDangerousChars(sanitized);
  if (sanitized.length !== originalLength) {
    wasModified = true;
    warnings.push('Dangerous control characters were removed');
  }

  // Detect and neutralize injection patterns
  const injectionResult = neutralizeInjectionPatterns(sanitized, strictMode);
  if (injectionResult.modified) {
    sanitized = injectionResult.text;
    wasModified = true;
    warnings.push(...injectionResult.warnings);
  }

  // Normalize whitespace
  const normalizedWhitespace = normalizeWhitespace(sanitized, allowNewlines);
  if (normalizedWhitespace !== sanitized) {
    sanitized = normalizedWhitespace;
    wasModified = true;
  }

  // Trim leading/trailing whitespace
  const trimmed = sanitized.trim();
  if (trimmed !== sanitized) {
    sanitized = trimmed;
    wasModified = true;
  }

  return {
    sanitized,
    wasModified,
    warnings,
  };
}

/**
 * Remove dangerous control characters from input
 */
function removeDangerousChars(input: string): string {
  let result = input;
  
  for (const char of DANGEROUS_CHARS) {
    result = result.replace(new RegExp(char, 'g'), '');
  }
  
  return result;
}

/**
 * Detect and neutralize prompt injection patterns
 */
function neutralizeInjectionPatterns(
  input: string,
  strictMode: boolean
): { text: string; modified: boolean; warnings: string[] } {
  let text = input;
  let modified = false;
  const warnings: string[] = [];

  for (const pattern of INJECTION_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      if (strictMode) {
        // In strict mode, completely remove the matched text
        text = text.replace(pattern, '[REMOVED]');
      } else {
        // In normal mode, escape the matched text to make it harmless
        text = text.replace(pattern, (match) => {
          return match.split('').join('\u200B'); // Insert zero-width spaces
        });
      }
      modified = true;
      warnings.push(`Potential prompt injection detected: "${matches[0].substring(0, 50)}..."`);
    }
  }

  return { text, modified, warnings };
}

/**
 * Normalize whitespace in input
 */
function normalizeWhitespace(input: string, allowNewlines: boolean): string {
  let result = input;

  if (!allowNewlines) {
    // Replace all newlines with spaces
    result = result.replace(/[\r\n]+/g, ' ');
  } else {
    // Normalize newlines to \n and limit consecutive newlines to 2
    result = result.replace(/\r\n/g, '\n');
    result = result.replace(/\n{3,}/g, '\n\n');
  }

  // Replace multiple spaces with single space
  result = result.replace(/[ \t]+/g, ' ');

  return result;
}

/**
 * Sanitize character name
 * More restrictive than general input sanitization
 */
export function sanitizeCharacterName(name: string): SanitizationResult {
  const result = sanitizeInput(name, {
    maxLength: 100,
    allowNewlines: false,
    strictMode: true,
  });

  // Additional validation for character names
  let sanitized = result.sanitized;
  const warnings = [...result.warnings];
  let wasModified = result.wasModified;

  // Remove special characters that could cause issues
  const cleaned = sanitized.replace(/[<>{}[\]\\\/]/g, '');
  if (cleaned !== sanitized) {
    sanitized = cleaned;
    wasModified = true;
    warnings.push('Special characters were removed from name');
  }

  return {
    sanitized,
    wasModified,
    warnings,
  };
}

/**
 * Sanitize character description
 * Allows more freedom than names but still prevents injection
 */
export function sanitizeDescription(description: string): SanitizationResult {
  return sanitizeInput(description, {
    maxLength: 2000,
    allowNewlines: true,
    strictMode: false,
  });
}

/**
 * Sanitize player action
 * Used for custom actions during gameplay
 */
export function sanitizeAction(action: string): SanitizationResult {
  return sanitizeInput(action, {
    maxLength: 1000,
    allowNewlines: false,
    strictMode: false,
  });
}

/**
 * Sanitize fusion ingredients
 * Character names that are being fused together
 */
export function sanitizeFusionIngredients(ingredients: string): SanitizationResult {
  return sanitizeInput(ingredients, {
    maxLength: 500,
    allowNewlines: false,
    strictMode: false,
  });
}

/**
 * Sanitize ability name or description
 */
export function sanitizeAbility(ability: string): SanitizationResult {
  return sanitizeInput(ability, {
    maxLength: 500,
    allowNewlines: false,
    strictMode: false,
  });
}

/**
 * Sanitize game name
 */
export function sanitizeGameName(name: string): SanitizationResult {
  return sanitizeInput(name, {
    maxLength: 100,
    allowNewlines: false,
    strictMode: true,
  });
}

/**
 * Sanitize house rules
 * Allows longer text and newlines
 */
export function sanitizeHouseRules(rules: string): SanitizationResult {
  return sanitizeInput(rules, {
    maxLength: 3000,
    allowNewlines: true,
    strictMode: false,
  });
}

/**
 * Batch sanitize multiple inputs
 * Useful for sanitizing all fields in a form at once
 */
export function sanitizeBatch(
  inputs: Record<string, string>,
  sanitizers: Record<string, (input: string) => SanitizationResult>
): Record<string, SanitizationResult> {
  const results: Record<string, SanitizationResult> = {};

  for (const [key, value] of Object.entries(inputs)) {
    const sanitizer = sanitizers[key] || sanitizeInput;
    results[key] = sanitizer(value);
  }

  return results;
}

/**
 * Check if input contains potential injection attempts
 * Returns true if suspicious patterns are detected
 */
export function containsInjectionAttempt(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return true;
    }
  }

  return false;
}

/**
 * Validate that sanitized input is safe to use
 * Throws an error if input is still dangerous after sanitization
 */
export function validateSanitized(result: SanitizationResult): void {
  if (containsInjectionAttempt(result.sanitized)) {
    throw new Error(
      'Input contains potential prompt injection patterns even after sanitization. Please rephrase your input.'
    );
  }

  if (result.sanitized.length === 0) {
    throw new Error('Input is empty after sanitization');
  }
}
