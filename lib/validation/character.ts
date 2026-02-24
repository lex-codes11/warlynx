/**
 * Character validation utilities
 * 
 * Provides validation functions for character data including
 * description length constraints and other character-related validations.
 */

import { GAME_ENHANCEMENT_CONSTANTS } from '@/types/game-enhancements';

/**
 * Validate character description length
 * 
 * @param description - The character description to validate
 * @returns Validation result with length info and any errors
 */
export function validateCharacterDescription(description: string): {
  isValid: boolean;
  length: number;
  remaining: number;
  error?: string;
} {
  const length = description.length;
  const maxLength = GAME_ENHANCEMENT_CONSTANTS.MAX_DESCRIPTION_LENGTH;
  const remaining = maxLength - length;

  if (length === 0) {
    return {
      isValid: false,
      length,
      remaining,
      error: 'Description cannot be empty',
    };
  }

  if (length > maxLength) {
    return {
      isValid: false,
      length,
      remaining,
      error: `Description exceeds maximum length of ${maxLength} characters`,
    };
  }

  return {
    isValid: true,
    length,
    remaining,
  };
}

/**
 * Truncate description to maximum allowed length
 * 
 * @param description - The description to truncate
 * @returns Truncated description
 */
export function truncateDescription(description: string): string {
  const maxLength = GAME_ENHANCEMENT_CONSTANTS.MAX_DESCRIPTION_LENGTH;
  if (description.length <= maxLength) {
    return description;
  }
  return description.substring(0, maxLength);
}

/**
 * Format character count display
 * 
 * @param current - Current character count
 * @param max - Maximum character count
 * @returns Formatted string for display (e.g., "500 / 1000")
 */
export function formatCharacterCount(current: number, max: number): string {
  return `${current} / ${max}`;
}

/**
 * Get character count color based on usage
 * 
 * @param current - Current character count
 * @param max - Maximum character count
 * @returns Color indicator: 'normal' | 'warning' | 'danger'
 */
export function getCharacterCountColor(
  current: number,
  max: number
): 'normal' | 'warning' | 'danger' {
  const percentage = (current / max) * 100;

  if (percentage >= 100) {
    return 'danger';
  } else if (percentage >= 90) {
    return 'warning';
  }

  return 'normal';
}
