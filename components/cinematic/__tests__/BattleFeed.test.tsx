/**
 * BattleFeed Component Tests
 * Tests basic rendering and structure
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BattleFeed, GameEvent } from '../BattleFeed';

describe('BattleFeed', () => {
  const mockEvents: GameEvent[] = [
    {
      id: '1',
      type: 'narrative',
      content: 'The battle begins!',
      timestamp: new Date('2024-01-01T12:00:00'),
    },
    {
      id: '2',
      type: 'action',
      content: 'Hero attacks the enemy!',
      character: {
        id: 'char1',
        name: 'Hero',
        imageUrl: '/hero.png',
      },
      timestamp: new Date('2024-01-01T12:00:05'),
    },
    {
      id: '3',
      type: 'ability',
      content: 'A powerful spell is cast!',
      character: {
        id: 'char2',
        name: 'Mage',
      },
      ability: {
        name: 'Fireball',
        description: 'A blazing sphere of fire',
        icon: '🔥',
      },
      timestamp: new Date('2024-01-01T12:00:10'),
    },
  ];

  it('renders without errors with valid events', () => {
    render(<BattleFeed events={mockEvents} />);
    expect(screen.getByText('The battle begins!')).toBeInTheDocument();
  });

  it('displays placeholder when events array is empty', () => {
    render(<BattleFeed events={[]} />);
    expect(screen.getByText('Awaiting battle events...')).toBeInTheDocument();
  });

  it('renders all events in the array', () => {
    render(<BattleFeed events={mockEvents} />);
    expect(screen.getByText('The battle begins!')).toBeInTheDocument();
    expect(screen.getByText('Hero attacks the enemy!')).toBeInTheDocument();
    expect(screen.getByText('A powerful spell is cast!')).toBeInTheDocument();
  });

  it('displays character name when character data is provided', () => {
    render(<BattleFeed events={mockEvents} />);
    expect(screen.getByText('Hero')).toBeInTheDocument();
    expect(screen.getByText('Mage')).toBeInTheDocument();
  });

  it('displays ability name with large typography when ability is present', () => {
    render(<BattleFeed events={mockEvents} />);
    // Text is split into individual characters for animation, so use a flexible matcher
    const abilityName = screen.getByText((content, element) => {
      return element?.tagName === 'H3' && element?.textContent === 'Fireball';
    });
    expect(abilityName).toBeInTheDocument();
    expect(abilityName).toHaveClass('text-4xl', 'font-bold');
  });

  it('displays ability icon when provided', () => {
    render(<BattleFeed events={mockEvents} />);
    expect(screen.getByText('🔥')).toBeInTheDocument();
  });

  it('displays event type icons for all events', () => {
    render(<BattleFeed events={mockEvents} />);
    // Check for event type labels
    const eventTypes = screen.getAllByText(/narrative|action|ability/i);
    expect(eventTypes.length).toBeGreaterThan(0);
  });

  it('handles missing character imageUrl gracefully', () => {
    const eventsWithoutImage: GameEvent[] = [
      {
        id: '1',
        type: 'action',
        content: 'Test content',
        character: {
          id: 'char1',
          name: 'TestChar',
        },
        timestamp: new Date(),
      },
    ];
    render(<BattleFeed events={eventsWithoutImage} />);
    expect(screen.getByText('TestChar')).toBeInTheDocument();
  });

  it('handles events without character data', () => {
    const eventsWithoutCharacter: GameEvent[] = [
      {
        id: '1',
        type: 'narrative',
        content: 'System message',
        timestamp: new Date(),
      },
    ];
    render(<BattleFeed events={eventsWithoutCharacter} />);
    expect(screen.getByText('System message')).toBeInTheDocument();
  });

  it('calls onEventRead callback when provided', () => {
    const onEventRead = jest.fn();
    render(<BattleFeed events={mockEvents} onEventRead={onEventRead} />);
    
    // Should be called for each event
    expect(onEventRead).toHaveBeenCalledTimes(mockEvents.length);
    expect(onEventRead).toHaveBeenCalledWith('1');
    expect(onEventRead).toHaveBeenCalledWith('2');
    expect(onEventRead).toHaveBeenCalledWith('3');
  });

  it('applies glass panel styling with glow borders', () => {
    const { container } = render(<BattleFeed events={mockEvents} />);
    const eventContainers = container.querySelectorAll('[class*="backdrop-blur"]');
    expect(eventContainers.length).toBeGreaterThan(0);
  });

  it('applies cinematic spacing between events', () => {
    const { container } = render(<BattleFeed events={mockEvents} />);
    const feedContainer = container.firstChild;
    expect(feedContainer).toHaveClass('space-y-4');
  });

  it('applies distinct visual treatment to ability events', () => {
    render(<BattleFeed events={mockEvents} />);
    // Text is split into individual characters for animation, so use a flexible matcher
    const abilityName = screen.getByText((content, element) => {
      return element?.tagName === 'H3' && element?.textContent === 'Fireball';
    });
    const abilityContainer = abilityName.closest('div[class*="bg-gradient-to-r"]');
    expect(abilityContainer).toBeInTheDocument();
    expect(abilityContainer).toHaveClass('rounded-lg', 'p-4', 'border');
  });

  it('displays ability icon in a badge container when provided', () => {
    const { container } = render(<BattleFeed events={mockEvents} />);
    const iconBadge = container.querySelector('[class*="bg-purple-500/20"]');
    expect(iconBadge).toBeInTheDocument();
    expect(screen.getByText('🔥')).toBeInTheDocument();
  });
});
