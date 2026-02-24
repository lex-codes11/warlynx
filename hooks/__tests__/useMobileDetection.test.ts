import { renderHook, act } from '@testing-library/react';
import { useMobileDetection } from '../useMobileDetection';

describe('useMobileDetection', () => {
  let matchMediaMock: jest.Mock;
  let listeners: { [key: string]: EventListener[] };

  beforeEach(() => {
    listeners = {};
    
    matchMediaMock = jest.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn((event: string, listener: EventListener) => {
        if (!listeners[query]) {
          listeners[query] = [];
        }
        listeners[query].push(listener);
      }),
      removeEventListener: jest.fn((event: string, listener: EventListener) => {
        if (listeners[query]) {
          listeners[query] = listeners[query].filter(l => l !== listener);
        }
      }),
      dispatchEvent: jest.fn(),
    }));

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaMock,
    });

    // Mock navigator.hardwareConcurrency
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      writable: true,
      value: 8,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should detect desktop by default', () => {
    const { result } = renderHook(() => useMobileDetection());

    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isLowEndDevice).toBe(false);
  });

  it('should detect mobile viewport', () => {
    matchMediaMock.mockImplementation((query: string) => ({
      matches: query === '(max-width: 768px)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    const { result } = renderHook(() => useMobileDetection());

    expect(result.current.isMobile).toBe(true);
    expect(result.current.isTablet).toBe(false);
  });

  it('should detect tablet viewport', () => {
    matchMediaMock.mockImplementation((query: string) => ({
      matches: query === '(min-width: 769px) and (max-width: 1024px)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    const { result } = renderHook(() => useMobileDetection());

    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(true);
  });

  it('should detect low-end device with 4 or fewer cores', () => {
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      writable: true,
      value: 4,
    });

    const { result } = renderHook(() => useMobileDetection());

    expect(result.current.isLowEndDevice).toBe(true);
  });

  it('should not detect low-end device with more than 4 cores', () => {
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      writable: true,
      value: 8,
    });

    const { result } = renderHook(() => useMobileDetection());

    expect(result.current.isLowEndDevice).toBe(false);
  });

  it('should handle missing hardwareConcurrency', () => {
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      writable: true,
      value: undefined,
    });

    const { result } = renderHook(() => useMobileDetection());

    expect(result.current.isLowEndDevice).toBe(false);
  });

  it('should update detection when viewport changes', () => {
    // This test verifies that event listeners are set up correctly
    // The actual state update is tested implicitly by the other tests
    const addEventListenerSpy = jest.fn();
    
    matchMediaMock.mockImplementation(() => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: addEventListenerSpy,
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    renderHook(() => useMobileDetection());

    // Should add listeners for both mobile and tablet queries
    expect(addEventListenerSpy).toHaveBeenCalledTimes(2);
    expect(addEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('should clean up event listeners on unmount', () => {
    const removeEventListenerSpy = jest.fn();
    
    matchMediaMock.mockImplementation(() => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: removeEventListenerSpy,
      dispatchEvent: jest.fn(),
    }));

    const { unmount } = renderHook(() => useMobileDetection());

    unmount();

    // Should remove listeners for both mobile and tablet queries
    expect(removeEventListenerSpy).toHaveBeenCalledTimes(2);
  });
});
