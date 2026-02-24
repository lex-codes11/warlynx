/**
 * Unit tests for ChoiceTile component
 * Tests rendering, interaction, and disabled state
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChoiceTile } from '../ChoiceTile';

describe('ChoiceTile', () => {
  const defaultProps = {
    letter: 'A' as const,
    title: 'Attack',
    hint: 'Deal damage to the enemy',
    icon: '⚔️',
    onSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without errors', () => {
    render(<ChoiceTile {...defaultProps} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('displays letter, title, hint, and icon', () => {
    render(<ChoiceTile {...defaultProps} />);
    
    // Check letter
    expect(screen.getByText('A')).toBeInTheDocument();
    
    // Check title
    expect(screen.getByText('Attack')).toBeInTheDocument();
    
    // Check hint
    expect(screen.getByText('Deal damage to the enemy')).toBeInTheDocument();
    
    // Check icon (using aria-label)
    expect(screen.getByLabelText('Choice A: Attack')).toBeInTheDocument();
  });

  it('calls onSelect when clicked', () => {
    const onSelect = jest.fn();
    render(<ChoiceTile {...defaultProps} onSelect={onSelect} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('does not call onSelect when disabled', () => {
    const onSelect = jest.fn();
    render(<ChoiceTile {...defaultProps} onSelect={onSelect} disabled={true} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('applies disabled styling when disabled', () => {
    render(<ChoiceTile {...defaultProps} disabled={true} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('opacity-50');
    expect(button).toHaveClass('grayscale');
    expect(button).toHaveClass('cursor-not-allowed');
    expect(button).toBeDisabled();
  });

  it('has proper accessibility attributes', () => {
    render(<ChoiceTile {...defaultProps} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Choice A: Attack');
    expect(button).toHaveAttribute('aria-disabled', 'false');
  });

  it('has proper accessibility attributes when disabled', () => {
    render(<ChoiceTile {...defaultProps} disabled={true} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });

  it('renders different letters correctly', () => {
    const letters: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];
    
    letters.forEach((letter) => {
      const { unmount } = render(
        <ChoiceTile {...defaultProps} letter={letter} />
      );
      expect(screen.getByText(letter)).toBeInTheDocument();
      unmount();
    });
  });

  it('applies glass panel styling', () => {
    render(<ChoiceTile {...defaultProps} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('backdrop-blur-lg');
    expect(button).toHaveClass('rounded-xl');
  });

  it('has hover effect classes when not disabled', () => {
    render(<ChoiceTile {...defaultProps} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('hover:border-cyan-500');
  });
});
