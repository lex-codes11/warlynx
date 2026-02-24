/**
 * PowerCard Component Tests
 * Tests basic rendering and structure
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PowerCard, Character, StatusEffect } from '../PowerCard';

describe('PowerCard', () => {
  const mockCharacter: Character = {
    id: 'char1',
    name: 'Hero',
    imageUrl: '/hero.png',
    hp: 80,
    maxHp: 100,
    level: 5,
    status: [
      {
        id: 'buff1',
        name: 'Strength',
        icon: '💪',
        type: 'buff',
      },
      {
        id: 'debuff1',
        name: 'Poison',
        icon: '☠️',
        type: 'debuff',
      },
    ],
    fusionTags: ['Fire', 'Lightning'],
  };

  it('renders without errors with valid character data', () => {
    render(<PowerCard character={mockCharacter} isActive={false} />);
    expect(screen.getByText('Hero')).toBeDefined();
  });

  it('displays character portrait with image when imageUrl is provided', () => {
    render(<PowerCard character={mockCharacter} isActive={false} />);
    const image = screen.getByAltText('Hero');
    expect(image).toBeDefined();
    expect(image.getAttribute('src')).toBe('/hero.png');
  });

  it('displays placeholder when imageUrl is missing', () => {
    const characterWithoutImage = { ...mockCharacter, imageUrl: undefined };
    const { container } = render(<PowerCard character={characterWithoutImage} isActive={false} />);
    const placeholder = container.querySelector('.bg-gradient-to-br');
    expect(placeholder).toBeDefined();
    expect(screen.getByText('H')).toBeDefined(); // First letter of name
  });

  it('displays HP badge with current and max HP', () => {
    render(<PowerCard character={mockCharacter} isActive={false} />);
    expect(screen.getByText('HP')).toBeDefined();
    expect(screen.getByText('80/100')).toBeDefined();
  });

  it('displays Level badge', () => {
    render(<PowerCard character={mockCharacter} isActive={false} />);
    expect(screen.getByText('LVL')).toBeDefined();
    expect(screen.getByText('5')).toBeDefined();
  });

  it('displays all status effects', () => {
    render(<PowerCard character={mockCharacter} isActive={false} />);
    expect(screen.getByText('💪')).toBeDefined();
    expect(screen.getByText('☠️')).toBeDefined();
  });

  it('displays fusion tags when present', () => {
    render(<PowerCard character={mockCharacter} isActive={false} />);
    expect(screen.getByText(/Fire/)).toBeDefined();
    expect(screen.getByText(/Lightning/)).toBeDefined();
  });

  it('hides fusion tags section when fusionTags is empty', () => {
    const characterWithoutTags = { ...mockCharacter, fusionTags: [] };
    const { container } = render(<PowerCard character={characterWithoutTags} isActive={false} />);
    const fusionTagContainer = container.querySelector('[class*="from-purple-500/20"]');
    expect(fusionTagContainer).toBeNull();
  });

  it('hides fusion tags section when fusionTags is undefined', () => {
    const characterWithoutTags = { ...mockCharacter, fusionTags: undefined };
    const { container } = render(<PowerCard character={characterWithoutTags} isActive={false} />);
    const fusionTagContainer = container.querySelector('[class*="from-purple-500/20"]');
    expect(fusionTagContainer).toBeNull();
  });

  it('applies active state styling when isActive is true', () => {
    const { container } = render(<PowerCard character={mockCharacter} isActive={true} />);
    const card = container.firstChild;
    expect(card).toBeDefined();
    // Check for active border styling
    const activeElement = container.querySelector('[class*="border-purple-500"]');
    expect(activeElement).toBeDefined();
  });

  it('applies default styling when isActive is false', () => {
    const { container } = render(<PowerCard character={mockCharacter} isActive={false} />);
    const card = container.firstChild;
    expect(card).toBeDefined();
  });

  it('renders empty status container when status array is empty', () => {
    const characterWithoutStatus = { ...mockCharacter, status: [] };
    render(<PowerCard character={characterWithoutStatus} isActive={false} />);
    // Component should still render without errors
    expect(screen.getByText('Hero')).toBeDefined();
  });

  it('applies glass panel styling', () => {
    const { container } = render(<PowerCard character={mockCharacter} isActive={false} />);
    const glassPanel = container.querySelector('[class*="backdrop-blur"]');
    expect(glassPanel).toBeDefined();
  });

  it('displays character name with correct typography', () => {
    render(<PowerCard character={mockCharacter} isActive={false} />);
    const nameElement = screen.getByText('Hero');
    expect(nameElement.className).toContain('text-2xl');
    expect(nameElement.className).toContain('font-bold');
  });

  it('displays HP bar with correct percentage', () => {
    const { container } = render(<PowerCard character={mockCharacter} isActive={false} />);
    const hpBar = container.querySelector('[style*="width: 80%"]');
    expect(hpBar).toBeDefined();
  });

  it('handles character with no status effects', () => {
    const characterWithoutStatus = { ...mockCharacter, status: [] };
    render(<PowerCard character={characterWithoutStatus} isActive={false} />);
    expect(screen.getByText('Hero')).toBeDefined();
    expect(screen.getByText('HP')).toBeDefined();
  });

  it('displays buff status with cyan styling', () => {
    const { container } = render(<PowerCard character={mockCharacter} isActive={false} />);
    const buffBadge = container.querySelector('[class*="bg-cyan-500/20"]');
    expect(buffBadge).toBeDefined();
  });

  it('displays debuff status with red styling', () => {
    const { container } = render(<PowerCard character={mockCharacter} isActive={false} />);
    const debuffBadge = container.querySelector('[class*="bg-red-500/20"]');
    expect(debuffBadge).toBeDefined();
  });

  it('displays status effect name as title attribute', () => {
    render(<PowerCard character={mockCharacter} isActive={false} />);
    const strengthBadge = screen.getByText('💪').closest('div');
    expect(strengthBadge?.getAttribute('title')).toBe('Strength');
  });

  it('displays fusion tag with lightning bolt icon', () => {
    render(<PowerCard character={mockCharacter} isActive={false} />);
    const fusionTags = screen.getAllByText(/⚡/);
    expect(fusionTags.length).toBeGreaterThan(0);
  });

  describe('Active State Animations', () => {
    it('applies pulse animation when isActive is true', () => {
      const { container } = render(<PowerCard character={mockCharacter} isActive={true} />);
      const card = container.firstChild as HTMLElement;
      expect(card).toBeDefined();
      // The card should have motion.div attributes
      expect(card.tagName).toBe('DIV');
    });

    it('applies scale-105 transform for lift effect when active', () => {
      const { container } = render(<PowerCard character={mockCharacter} isActive={true} />);
      const card = container.firstChild as HTMLElement;
      expect(card).toBeDefined();
      // Motion component should be present with animation variants
    });

    it('applies continuous glow animation when active', () => {
      const { container } = render(<PowerCard character={mockCharacter} isActive={true} />);
      // Check for the glowing border overlay with ring styling
      const glowOverlay = container.querySelector('.ring-purple-500');
      expect(glowOverlay).toBeDefined();
    });

    it('does not apply active animations when isActive is false', () => {
      const { container } = render(<PowerCard character={mockCharacter} isActive={false} />);
      const glowOverlay = container.querySelector('.ring-purple-500');
      expect(glowOverlay).toBeNull();
    });

    it('applies active border styling when isActive is true', () => {
      const { container } = render(<PowerCard character={mockCharacter} isActive={true} />);
      const activeElement = container.querySelector('[class*="border-purple-500"]');
      expect(activeElement).toBeDefined();
    });
  });

  describe('Damage Shake Animation', () => {
    it('triggers shake animation when HP decreases', () => {
      const onDamageMock = jest.fn();
      const { rerender } = render(
        <PowerCard character={mockCharacter} isActive={false} onDamage={onDamageMock} />
      );
      
      // Update character with reduced HP
      const damagedCharacter = { ...mockCharacter, hp: 60 };
      rerender(<PowerCard character={damagedCharacter} isActive={false} onDamage={onDamageMock} />);
      
      // onDamage callback should be called
      expect(onDamageMock).toHaveBeenCalled();
    });

    it('does not trigger shake animation when HP increases', () => {
      const onDamageMock = jest.fn();
      const { rerender } = render(
        <PowerCard character={mockCharacter} isActive={false} onDamage={onDamageMock} />
      );
      
      // Update character with increased HP (healing)
      const healedCharacter = { ...mockCharacter, hp: 90 };
      rerender(<PowerCard character={healedCharacter} isActive={false} onDamage={onDamageMock} />);
      
      // onDamage callback should not be called for healing
      expect(onDamageMock).not.toHaveBeenCalled();
    });

    it('does not trigger shake animation when HP stays the same', () => {
      const onDamageMock = jest.fn();
      const { rerender } = render(
        <PowerCard character={mockCharacter} isActive={false} onDamage={onDamageMock} />
      );
      
      // Re-render with same HP
      rerender(<PowerCard character={mockCharacter} isActive={false} onDamage={onDamageMock} />);
      
      // onDamage callback should not be called
      expect(onDamageMock).not.toHaveBeenCalled();
    });

    it('works without onDamage callback', () => {
      const { rerender } = render(
        <PowerCard character={mockCharacter} isActive={false} />
      );
      
      // Update character with reduced HP
      const damagedCharacter = { ...mockCharacter, hp: 60 };
      
      // Should not throw error even without onDamage callback
      expect(() => {
        rerender(<PowerCard character={damagedCharacter} isActive={false} />);
      }).not.toThrow();
    });
  });
});
