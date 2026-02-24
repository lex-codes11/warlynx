/**
 * Unit tests for Stat Updater
 * 
 * Tests stat update logic, level-up handling, and status effect management
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  mergeStatuses,
  tickStatusDurations,
} from '../stat-updater';
import { Status } from '../../types';

describe('Stat Updater', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('mergeStatuses', () => {
    it('should add new statuses to empty array', () => {
      const currentStatuses: Status[] = [];
      const newStatuses: Status[] = [
        {
          name: 'Burning',
          description: 'Taking fire damage',
          duration: 3,
          effect: '-5 HP per turn',
        },
      ];

      const result = mergeStatuses(currentStatuses, newStatuses);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Burning');
      expect(result[0].duration).toBe(3);
    });

    it('should refresh duration of existing status if new duration is longer', () => {
      const currentStatuses: Status[] = [
        {
          name: 'Burning',
          description: 'Taking fire damage',
          duration: 1,
          effect: '-5 HP per turn',
        },
      ];
      const newStatuses: Status[] = [
        {
          name: 'Burning',
          description: 'Taking fire damage',
          duration: 3,
          effect: '-5 HP per turn',
        },
      ];

      const result = mergeStatuses(currentStatuses, newStatuses);

      expect(result).toHaveLength(1);
      expect(result[0].duration).toBe(3);
    });

    it('should keep existing duration if new duration is shorter', () => {
      const currentStatuses: Status[] = [
        {
          name: 'Burning',
          description: 'Taking fire damage',
          duration: 5,
          effect: '-5 HP per turn',
        },
      ];
      const newStatuses: Status[] = [
        {
          name: 'Burning',
          description: 'Taking fire damage',
          duration: 2,
          effect: '-5 HP per turn',
        },
      ];

      const result = mergeStatuses(currentStatuses, newStatuses);

      expect(result).toHaveLength(1);
      expect(result[0].duration).toBe(5);
    });

    it('should add multiple different statuses', () => {
      const currentStatuses: Status[] = [
        {
          name: 'Burning',
          description: 'Taking fire damage',
          duration: 2,
          effect: '-5 HP per turn',
        },
      ];
      const newStatuses: Status[] = [
        {
          name: 'Poisoned',
          description: 'Taking poison damage',
          duration: 3,
          effect: '-3 HP per turn',
        },
        {
          name: 'Strengthened',
          description: 'Increased strength',
          duration: 2,
          effect: '+10 Strength',
        },
      ];

      const result = mergeStatuses(currentStatuses, newStatuses);

      expect(result).toHaveLength(3);
      expect(result.map(s => s.name)).toContain('Burning');
      expect(result.map(s => s.name)).toContain('Poisoned');
      expect(result.map(s => s.name)).toContain('Strengthened');
    });
  });

  describe('tickStatusDurations', () => {
    it('should decrement all status durations by 1', () => {
      const statuses: Status[] = [
        {
          name: 'Burning',
          description: 'Taking fire damage',
          duration: 3,
          effect: '-5 HP per turn',
        },
        {
          name: 'Poisoned',
          description: 'Taking poison damage',
          duration: 2,
          effect: '-3 HP per turn',
        },
      ];

      const result = tickStatusDurations(statuses);

      expect(result).toHaveLength(2);
      expect(result[0].duration).toBe(2);
      expect(result[1].duration).toBe(1);
    });

    it('should remove statuses with duration 0 or less', () => {
      const statuses: Status[] = [
        {
          name: 'Burning',
          description: 'Taking fire damage',
          duration: 1,
          effect: '-5 HP per turn',
        },
        {
          name: 'Poisoned',
          description: 'Taking poison damage',
          duration: 2,
          effect: '-3 HP per turn',
        },
      ];

      const result = tickStatusDurations(statuses);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Poisoned');
      expect(result[0].duration).toBe(1);
    });

    it('should return empty array when all statuses expire', () => {
      const statuses: Status[] = [
        {
          name: 'Burning',
          description: 'Taking fire damage',
          duration: 1,
          effect: '-5 HP per turn',
        },
      ];

      const result = tickStatusDurations(statuses);

      expect(result).toHaveLength(0);
    });

    it('should handle empty status array', () => {
      const statuses: Status[] = [];

      const result = tickStatusDurations(statuses);

      expect(result).toHaveLength(0);
    });
  });
});
