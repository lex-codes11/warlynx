/**
 * Unit tests for ErrorBoundary component
 * Tests error catching, logging, and fallback UI rendering
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

// Component that throws an error for testing
const ThrowError = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  // Suppress console.error for cleaner test output
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  describe('Normal rendering', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should render multiple children without errors', () => {
      render(
        <ErrorBoundary>
          <div>First child</div>
          <div>Second child</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('First child')).toBeInTheDocument();
      expect(screen.getByText('Second child')).toBeInTheDocument();
    });
  });

  describe('Error catching', () => {
    it('should catch errors and display fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('System Error')).toBeInTheDocument();
      expect(screen.getByText(/An unexpected error occurred/)).toBeInTheDocument();
    });

    it('should display error message in details section', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const details = screen.getByText('Technical Details');
      fireEvent.click(details);

      expect(screen.getByText(/Test error/)).toBeInTheDocument();
    });

    it('should call onError callback when error occurs', () => {
      const onError = jest.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('should log error to console', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error');
      
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Custom fallback', () => {
    it('should render custom fallback when provided', () => {
      const customFallback = <div>Custom error message</div>;
      
      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
      expect(screen.queryByText('System Error')).not.toBeInTheDocument();
    });
  });

  describe('Cinematic styling', () => {
    it('should use cinematic background color', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const outerContainer = container.querySelector('.bg-\\[\\#0B0B12\\]');
      expect(outerContainer).toBeInTheDocument();
    });

    it('should apply glass panel styling to error card', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const errorCard = container.querySelector('.bg-gray-900\\/60');
      expect(errorCard).toBeInTheDocument();
      expect(errorCard).toHaveClass('backdrop-blur-lg');
    });

    it('should apply neon glow effect to error card', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const errorCard = container.querySelector('.border-red-500\\/30');
      expect(errorCard).toBeInTheDocument();
    });
  });

  describe('Error recovery', () => {
    it('should have Try Again button', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should have Reload Page button', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Reload Page')).toBeInTheDocument();
    });

    it('should have Dashboard button', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('should apply cinematic button styling', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const tryAgainButton = screen.getByText('Try Again');
      expect(tryAgainButton).toHaveClass('bg-cyan-600');
      expect(tryAgainButton.className).toMatch(/shadow-\[0_0_10px_rgba\(6,182,212,0\.3\)\]/);

      const reloadButton = screen.getByText('Reload Page');
      expect(reloadButton).toHaveClass('bg-purple-600');
      expect(reloadButton.className).toMatch(/shadow-\[0_0_10px_rgba\(168,85,247,0\.3\)\]/);
    });
  });

  describe('Responsive design', () => {
    it('should have responsive button layout', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const buttonContainer = screen.getByText('Try Again').closest('div');
      expect(buttonContainer).toHaveClass('flex');
      expect(buttonContainer).toHaveClass('flex-col');
      expect(buttonContainer).toHaveClass('sm:flex-row');
    });

    it('should have responsive padding on outer container', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const outerContainer = container.querySelector('.p-4');
      expect(outerContainer).toBeInTheDocument();
    });
  });

  describe('Error information display', () => {
    it('should show warning icon with pulse animation', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const icon = screen.getByText('⚠️');
      expect(icon).toHaveClass('animate-pulse');
      expect(icon).toHaveClass('text-red-500');
    });

    it('should display error title in red', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const title = screen.getByText('System Error');
      expect(title).toHaveClass('text-red-400');
    });

    it('should display error description', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/An unexpected error occurred/)).toBeInTheDocument();
      expect(screen.getByText(/The system has been notified/)).toBeInTheDocument();
    });
  });
});
