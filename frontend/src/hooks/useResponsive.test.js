import { renderHook, act } from '@testing-library/react';
import useResponsive from './useResponsive';

// Mock window object
const mockWindow = {
  innerWidth: 1024,
  innerHeight: 768,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// Mock navigator
const mockNavigator = {
  maxTouchPoints: 0,
  msMaxTouchPoints: 0,
};

Object.defineProperty(window, 'innerWidth', { value: mockWindow.innerWidth, writable: true });
Object.defineProperty(window, 'innerHeight', { value: mockWindow.innerHeight, writable: true });
Object.defineProperty(window, 'addEventListener', { value: mockWindow.addEventListener });
Object.defineProperty(window, 'removeEventListener', { value: mockWindow.removeEventListener });
Object.defineProperty(navigator, 'maxTouchPoints', { value: mockNavigator.maxTouchPoints });
Object.defineProperty(navigator, 'msMaxTouchPoints', { value: mockNavigator.msMaxTouchPoints });

describe('useResponsive Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns correct initial values', () => {
    const { result } = renderHook(() => useResponsive());

    expect(result.current.windowSize).toEqual({ width: 1024, height: 768 });
    expect(result.current.orientation).toBe('landscape');
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isLaptop).toBe(true);
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.breakpoint).toBe('laptop');
  });

  it('detects mobile breakpoint', () => {
    window.innerWidth = 480;
    window.innerHeight = 800;

    const { result } = renderHook(() => useResponsive());

    expect(result.current.isMobile).toBe(true);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.breakpoint).toBe('mobile');
  });

  it('detects tablet breakpoint', () => {
    window.innerWidth = 768;
    window.innerHeight = 1024;

    const { result } = renderHook(() => useResponsive());

    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(true);
    expect(result.current.breakpoint).toBe('tablet');
  });

  it('detects desktop breakpoint', () => {
    window.innerWidth = 1440;
    window.innerHeight = 900;

    const { result } = renderHook(() => useResponsive());

    expect(result.current.isDesktop).toBe(true);
    expect(result.current.breakpoint).toBe('desktop');
  });

  it('detects portrait orientation', () => {
    window.innerWidth = 480;
    window.innerHeight = 800;

    const { result } = renderHook(() => useResponsive());

    expect(result.current.orientation).toBe('portrait');
  });

  it('detects landscape orientation', () => {
    window.innerWidth = 1024;
    window.innerHeight = 768;

    const { result } = renderHook(() => useResponsive());

    expect(result.current.orientation).toBe('landscape');
  });

  it('detects touch device', () => {
    // Mock touch device
    Object.defineProperty(window, 'ontouchstart', { value: true });
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 1 });

    const { result } = renderHook(() => useResponsive());

    expect(result.current.isTouchDevice).toBe(true);
  });

  it('detects non-touch device', () => {
    // Mock non-touch device
    Object.defineProperty(window, 'ontouchstart', { value: false });
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 0 });

    const { result } = renderHook(() => useResponsive());

    expect(result.current.isTouchDevice).toBe(false);
  });

  it('updates on window resize', () => {
    const { result } = renderHook(() => useResponsive());

    // Simulate window resize
    act(() => {
      window.innerWidth = 640;
      window.innerHeight = 480;

      // Trigger resize event
      const resizeEvent = new Event('resize');
      window.dispatchEvent(resizeEvent);
    });

    expect(result.current.windowSize).toEqual({ width: 640, height: 480 });
    expect(result.current.orientation).toBe('landscape');
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(true);
  });

  it('adds and removes resize event listener', () => {
    renderHook(() => useResponsive());

    expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('handles SSR (server-side rendering)', () => {
    // Mock SSR environment
    Object.defineProperty(window, 'innerWidth', { value: undefined });
    Object.defineProperty(window, 'innerHeight', { value: undefined });

    const { result } = renderHook(() => useResponsive());

    expect(result.current.windowSize).toEqual({ width: 0, height: 0 });
    expect(result.current.orientation).toBe('portrait');
  });
});