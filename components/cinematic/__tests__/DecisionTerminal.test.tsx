/**
 * Unit tests for DecisionTerminal component
 * Tests rendering, interaction, and disabled state
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DecisionTerminal } from '../DecisionTerminal';

describe('DecisionTerminal', () => {
  const defaultProps = {
    characterName: 'Warrior',
    isPlayerTurn: true,
    aiMoves: {
      A: 'Attack - Deal damage to the enemy',
      B: 'Defend - Reduce incoming damage',
      C: 'Heal - Restore health points',
      D: 'Special - Use special ability',
    },
    onMoveSelected: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without errors', () => {
    render(<DecisionTerminal {...defaultProps} />);
    expect(screen.getByText(/YOUR TURN — WARRIOR/i)).toBeInTheDocument();
  });

  it('displays header with character name in correct format', () => {
    render(<DecisionTerminal {...defaultProps} />);
    
    // Check for lightning bolt emoji and format
    const header = screen.getByText(/YOUR TURN — WARRIOR/i);
    expect(header).toBeInTheDocument();
    
    // Check that character name is uppercase
    expect(screen.getByText(/WARRIOR/)).toBeInTheDocument();
  });

  it('renders 4 choice tiles', () => {
    render(<DecisionTerminal {...defaultProps} />);
    
    // Check all 4 letters are present
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  it('displays parsed titles from aiMoves', () => {
    render(<DecisionTerminal {...defaultProps} />);
    
    expect(screen.getByText('Attack')).toBeInTheDocument();
    expect(screen.getByText('Defend')).toBeInTheDocument();
    expect(screen.getByText('Heal')).toBeInTheDocument();
    expect(screen.getByText('Special')).toBeInTheDocument();
  });

  it('displays parsed hints from aiMoves', () => {
    render(<DecisionTerminal {...defaultProps} />);
    
    expect(screen.getByText('Deal damage to the enemy')).toBeInTheDocument();
    expect(screen.getByText('Reduce incoming damage')).toBeInTheDocument();
    expect(screen.getByText('Restore health points')).toBeInTheDocument();
    expect(screen.getByText('Use special ability')).toBeInTheDocument();
  });

  it('calls onMoveSelected with correct letter when choice tile is clicked', () => {
    const onMoveSelected = jest.fn();
    render(<DecisionTerminal {...defaultProps} onMoveSelected={onMoveSelected} />);
    
    const choiceA = screen.getByLabelText('Choice A: Attack');
    fireEvent.click(choiceA);
    
    expect(onMoveSelected).toHaveBeenCalledWith('A');
  });

  it('renders custom action input field', () => {
    render(<DecisionTerminal {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Or type a custom action...');
    expect(input).toBeInTheDocument();
  });

  it('calls onMoveSelected with custom action when submitted', () => {
    const onMoveSelected = jest.fn();
    render(<DecisionTerminal {...defaultProps} onMoveSelected={onMoveSelected} />);
    
    const input = screen.getByPlaceholderText('Or type a custom action...');
    fireEvent.change(input, { target: { value: 'Custom move' } });
    
    const form = input.closest('form');
    fireEvent.submit(form!);
    
    expect(onMoveSelected).toHaveBeenCalledWith('Custom move');
  });

  it('clears custom action input after submission', () => {
    render(<DecisionTerminal {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Or type a custom action...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Custom move' } });
    
    const form = input.closest('form');
    fireEvent.submit(form!);
    
    expect(input.value).toBe('');
  });

  it('does not submit empty custom action', () => {
    const onMoveSelected = jest.fn();
    render(<DecisionTerminal {...defaultProps} onMoveSelected={onMoveSelected} />);
    
    const input = screen.getByPlaceholderText('Or type a custom action...');
    const form = input.closest('form');
    fireEvent.submit(form!);
    
    expect(onMoveSelected).not.toHaveBeenCalled();
  });

  it('trims whitespace from custom action', () => {
    const onMoveSelected = jest.fn();
    render(<DecisionTerminal {...defaultProps} onMoveSelected={onMoveSelected} />);
    
    const input = screen.getByPlaceholderText('Or type a custom action...');
    fireEvent.change(input, { target: { value: '  Custom move  ' } });
    
    const form = input.closest('form');
    fireEvent.submit(form!);
    
    expect(onMoveSelected).toHaveBeenCalledWith('Custom move');
  });

  describe('when isPlayerTurn is false', () => {
    it('displays waiting message', () => {
      render(<DecisionTerminal {...defaultProps} isPlayerTurn={false} />);
      
      expect(screen.getByText(/WAITING — WARRIOR/i)).toBeInTheDocument();
      expect(screen.getByText('Waiting for other players...')).toBeInTheDocument();
    });

    it('disables all choice tiles', () => {
      render(<DecisionTerminal {...defaultProps} isPlayerTurn={false} />);
      
      const buttons = screen.getAllByRole('button');
      // Filter out the submit button if visible
      const choiceButtons = buttons.filter(btn => 
        btn.getAttribute('aria-label')?.startsWith('Choice')
      );
      
      choiceButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('disables custom action input', () => {
      render(<DecisionTerminal {...defaultProps} isPlayerTurn={false} />);
      
      const input = screen.getByPlaceholderText('Waiting for your turn...');
      expect(input).toBeDisabled();
    });

    it('does not call onMoveSelected when choice tile is clicked', () => {
      const onMoveSelected = jest.fn();
      render(<DecisionTerminal {...defaultProps} isPlayerTurn={false} onMoveSelected={onMoveSelected} />);
      
      const choiceA = screen.getByLabelText('Choice A: Attack');
      fireEvent.click(choiceA);
      
      expect(onMoveSelected).not.toHaveBeenCalled();
    });
  });

  describe('when isLoading is true', () => {
    it('disables all choice tiles', () => {
      render(<DecisionTerminal {...defaultProps} isLoading={true} />);
      
      const buttons = screen.getAllByRole('button');
      const choiceButtons = buttons.filter(btn => 
        btn.getAttribute('aria-label')?.startsWith('Choice')
      );
      
      choiceButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('disables custom action input', () => {
      render(<DecisionTerminal {...defaultProps} isLoading={true} />);
      
      const input = screen.getByLabelText('Custom action input');
      expect(input).toBeDisabled();
    });
  });

  it('applies glass panel styling', () => {
    const { container } = render(<DecisionTerminal {...defaultProps} />);
    
    const mainDiv = container.firstChild as HTMLElement;
    expect(mainDiv).toHaveClass('backdrop-blur-lg');
    expect(mainDiv).toHaveClass('rounded-xl');
  });

  it('uses grid layout for choice tiles', () => {
    const { container } = render(<DecisionTerminal {...defaultProps} />);
    
    const grid = container.querySelector('.grid');
    expect(grid).toHaveClass('grid-cols-1');
    expect(grid).toHaveClass('md:grid-cols-2');
  });

  it('handles move descriptions without hints', () => {
    const propsWithoutHints = {
      ...defaultProps,
      aiMoves: {
        A: 'Attack',
        B: 'Defend',
        C: 'Heal',
        D: 'Special',
      },
    };
    
    render(<DecisionTerminal {...propsWithoutHints} />);
    
    // Should display titles
    expect(screen.getByText('Attack')).toBeInTheDocument();
    
    // Should display default hint
    expect(screen.getAllByText('Execute this action').length).toBeGreaterThan(0);
  });

  it('shows submit button when custom action has text', () => {
    render(<DecisionTerminal {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Or type a custom action...');
    fireEvent.change(input, { target: { value: 'Custom' } });
    
    const submitButton = screen.getByLabelText('Submit custom action');
    expect(submitButton).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<DecisionTerminal {...defaultProps} />);
    
    const input = screen.getByLabelText('Custom action input');
    expect(input).toHaveAttribute('id', 'custom-action');
    
    // Check that all choice tiles have proper aria-labels
    expect(screen.getByLabelText('Choice A: Attack')).toBeInTheDocument();
    expect(screen.getByLabelText('Choice B: Defend')).toBeInTheDocument();
    expect(screen.getByLabelText('Choice C: Heal')).toBeInTheDocument();
    expect(screen.getByLabelText('Choice D: Special')).toBeInTheDocument();
  });

  describe('keyboard navigation', () => {
    it('calls onMoveSelected when A key is pressed', () => {
      const onMoveSelected = jest.fn();
      render(<DecisionTerminal {...defaultProps} onMoveSelected={onMoveSelected} />);
      
      fireEvent.keyDown(window, { key: 'a' });
      
      expect(onMoveSelected).toHaveBeenCalledWith('A');
    });

    it('calls onMoveSelected when B key is pressed', () => {
      const onMoveSelected = jest.fn();
      render(<DecisionTerminal {...defaultProps} onMoveSelected={onMoveSelected} />);
      
      fireEvent.keyDown(window, { key: 'b' });
      
      expect(onMoveSelected).toHaveBeenCalledWith('B');
    });

    it('calls onMoveSelected when C key is pressed', () => {
      const onMoveSelected = jest.fn();
      render(<DecisionTerminal {...defaultProps} onMoveSelected={onMoveSelected} />);
      
      fireEvent.keyDown(window, { key: 'c' });
      
      expect(onMoveSelected).toHaveBeenCalledWith('C');
    });

    it('calls onMoveSelected when D key is pressed', () => {
      const onMoveSelected = jest.fn();
      render(<DecisionTerminal {...defaultProps} onMoveSelected={onMoveSelected} />);
      
      fireEvent.keyDown(window, { key: 'd' });
      
      expect(onMoveSelected).toHaveBeenCalledWith('D');
    });

    it('handles uppercase key presses', () => {
      const onMoveSelected = jest.fn();
      render(<DecisionTerminal {...defaultProps} onMoveSelected={onMoveSelected} />);
      
      fireEvent.keyDown(window, { key: 'A' });
      
      expect(onMoveSelected).toHaveBeenCalledWith('A');
    });

    it('does not trigger keyboard shortcuts when typing in custom action input', () => {
      const onMoveSelected = jest.fn();
      render(<DecisionTerminal {...defaultProps} onMoveSelected={onMoveSelected} />);
      
      const input = screen.getByPlaceholderText('Or type a custom action...');
      input.focus();
      
      fireEvent.keyDown(input, { key: 'a' });
      
      expect(onMoveSelected).not.toHaveBeenCalled();
    });

    it('does not trigger keyboard shortcuts when disabled', () => {
      const onMoveSelected = jest.fn();
      render(<DecisionTerminal {...defaultProps} isPlayerTurn={false} onMoveSelected={onMoveSelected} />);
      
      fireEvent.keyDown(window, { key: 'a' });
      
      expect(onMoveSelected).not.toHaveBeenCalled();
    });

    it('does not trigger keyboard shortcuts when loading', () => {
      const onMoveSelected = jest.fn();
      render(<DecisionTerminal {...defaultProps} isLoading={true} onMoveSelected={onMoveSelected} />);
      
      fireEvent.keyDown(window, { key: 'a' });
      
      expect(onMoveSelected).not.toHaveBeenCalled();
    });

    it('ignores non-ABCD key presses', () => {
      const onMoveSelected = jest.fn();
      render(<DecisionTerminal {...defaultProps} onMoveSelected={onMoveSelected} />);
      
      fireEvent.keyDown(window, { key: 'e' });
      fireEvent.keyDown(window, { key: 'Enter' });
      fireEvent.keyDown(window, { key: 'Escape' });
      
      expect(onMoveSelected).not.toHaveBeenCalled();
    });
  });
});
