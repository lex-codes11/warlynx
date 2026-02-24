/**
 * Tests for useReducedMotion hook
 */

import { renderHook } from '@testing-library/react';
import { useReducedMotion } from '../useReducedMotion';

describe('useReducedMotion', () => {
  let matchMediaMock: jest.Mock;
  let addEventListenerMock: jest.Mock;
  let removeEventListenerMock: jest.Mock;

  beforeEach(() => {
    addEventListenerMock = jest.fn();
    removeEventListenerMock = jest.fn();
    matchMediaMock = jest.fn();

    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaMock,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return false when prefers-reduced-motion is not set', () => {
    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: addEventListenerMock,
      removeEventListener: removeEventListenerMock,
    });

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);
    expect(matchMediaMock).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });

  it('should return true when prefers-reduced-motion is set', () => {
    matchMediaMock.mockReturnValue({
      matches: true,
      addEventListener: addEventListenerMock,
      removeEventListener: removeEventListenerMock,
    });

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(true);
    expect(matchMediaMock).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });

  it('should add event listener for media query changes', () => {
    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: addEventListenerMock,
      removeEventListener: removeEventListenerMock,
    });

    renderHook(() => useReducedMotion());

    expect(addEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('should remove event listener on unmount', () => {
    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: addEventListenerMock,
      removeEventListener: removeEventListenerMock,
    });

    const { unmount } = renderHook(() => useReducedMotion());

    unmount();

    expect(removeEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('should update when media query changes', () => {
    let changeHandler: ((event: MediaQueryListEvent) => void) | null = null;

    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: (event: string, handler: (event: MediaQueryListEvent) => void) => {
        changeHandler = handler;
      },
      removeEventListener: removeEventListenerMock,
    });

    const { result, rerender } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);

    // Simulate media query change
    if (changeHandler) {
      changeHandler({ matches: true } as MediaQueryListEvent);
      rerender();
    }

    expect(result.current).toBe(true);
  });
});
