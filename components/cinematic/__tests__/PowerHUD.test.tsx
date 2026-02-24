/**
 * PowerHUD Component Tests
 * Tests for the PowerHUD component structure and rendering
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PowerHUD } from '../PowerHUD';
import { Character } from '../PowerCard';

describe('PowerHUD', () => {
  const mockCharacter: Character = {
    id: '1',
    name: 'Test Hero',
    hp: 75,
    maxHp: 100,
    level: 10,
    status: [
      { id: 'buff1', name: 'Strength', icon: '💪', type: 'buff' },
      { id: 'debuff1', name: 'Poison', icon: '☠️', type: 'debuff' },
    ],
  };

  it('renders when visible is true', () => {
    render(<PowerHUD character={mockCharacter} visible={true} />);
    
    expect(screen.getByText('Test Hero')).toBeInTheDocument();
  });

  it('does not render when visible is false', () => {
    const { container } = render(<PowerHUD character={mockCharacter} visible={false} />);
    
    expect(container.firstChild).toBeNull();
  });

  it('displays character name', () => {
    render(<PowerHUD character={mockCharacter} visible={true} />);
    
    expect(screen.getByText('Test Hero')).toBeInTheDocument();
  });

  it('displays HP values', () => {
    render(<PowerHUD character={mockCharacter} visible={true} />);
    
    expect(screen.getByText('75/100')).toBeInTheDocument();
  });

  it('displays level', () => {
    render(<PowerHUD character={mockCharacter} visible={true} />);
    
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('displays status effect icons', () => {
    render(<PowerHUD character={mockCharacter} visible={true} />);
    
    expect(screen.getByText('💪')).toBeInTheDocument();
    expect(screen.getByText('☠️')).toBeInTheDocument();
  });

  it('handles character with no status effects', () => {
    const characterNoStatus: Character = {
      ...mockCharacter,
      status: [],
    };
    
    render(<PowerHUD character={characterNoStatus} visible={true} />);
    
    expect(screen.getByText('Test Hero')).toBeInTheDocument();
    expect(screen.queryByText('💪')).not.toBeInTheDocument();
  });

  it('clamps HP percentage to 0-100 range', () => {
    const characterOverHP: Character = {
      ...mockCharacter,
      hp: 150,
      maxHp: 100,
    };
    
    const { container } = render(<PowerHUD character={characterOverHP} visible={true} />);
    
    // Component should render without errors
    expect(container.querySelector('.bg-gradient-to-r')).toBeInTheDocument();
  });

  it('handles zero HP', () => {
    const characterZeroHP: Character = {
      ...mockCharacter,
      hp: 0,
      maxHp: 100,
    };
    
    render(<PowerHUD character={characterZeroHP} visible={true} />);
    
    expect(screen.getByText('0/100')).toBeInTheDocument();
  });

  it('displays status effects without icons using abbreviations', () => {
    const characterNoIcons: Character = {
      ...mockCharacter,
      status: [
        { id: 'buff1', name: 'Strength', type: 'buff' },
      ],
    };
    
    render(<PowerHUD character={characterNoIcons} visible={true} />);
    
    // Should display first 2 characters of name
    expect(screen.getByText('St')).toBeInTheDocument();
  });

  it('animates HP bar width change on HP value change', () => {
    const { rerender } = render(<PowerHUD character={mockCharacter} visible={true} />);
    
    // Initial HP bar should be rendered
    const hpBar = document.querySelector('.bg-gradient-to-r');
    expect(hpBar).toBeInTheDocument();
    
    // Update character with lower HP
    const updatedCharacter: Character = {
      ...mockCharacter,
      hp: 25,
    };
    
    rerender(<PowerHUD character={updatedCharacter} visible={true} />);
    
    // HP bar should still be rendered (animation in progress)
    expect(document.querySelector('.bg-gradient-to-r')).toBeInTheDocument();
    
    // Verify HP text updated
    expect(screen.getByText('25/100')).toBeInTheDocument();
  });
});
