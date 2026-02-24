/**
 * Tests for TypingIndicator Component
 * 
 * Validates Requirements: 11.2, 11.3
 */

import { render, screen } from '@testing-library/react';
import { TypingIndicator } from '../TypingIndicator';

describe('TypingIndicator', () => {
  it('should hide when no players are typing', () => {
    const { container } = render(<TypingIndicator typingPlayers={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should display single player typing message', () => {
    render(<TypingIndicator typingPlayers={['Alice']} />);
    expect(screen.getByText(/Alice is typing/i)).toBeInTheDocument();
  });

  it('should display two players typing message', () => {
    render(<TypingIndicator typingPlayers={['Alice', 'Bob']} />);
    expect(screen.getByText(/Alice and Bob are typing/i)).toBeInTheDocument();
  });

  it('should display multiple players typing message', () => {
    render(<TypingIndicator typingPlayers={['Alice', 'Bob', 'Charlie']} />);
    expect(screen.getByText(/3 players are typing/i)).toBeInTheDocument();
  });

  it('should display animated dots indicator', () => {
    const { container } = render(<TypingIndicator typingPlayers={['Alice']} />);
    const dots = container.querySelectorAll('.animate-pulse');
    expect(dots).toHaveLength(3);
  });

  it('should apply custom className', () => {
    const { container } = render(
      <TypingIndicator typingPlayers={['Alice']} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should position indicator next to player name', () => {
    render(<TypingIndicator typingPlayers={['Alice']} />);
    const indicator = screen.getByText(/Alice is typing/i).parentElement;
    expect(indicator).toHaveClass('flex', 'items-center', 'gap-2');
  });
});
