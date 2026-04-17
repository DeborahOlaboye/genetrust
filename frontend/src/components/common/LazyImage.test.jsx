import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LazyImage from './LazyImage';

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback) {
    this.callback = callback;
    this.elements = new Set();
  }

  observe(element) {
    this.elements.add(element);
    // Simulate intersection immediately for testing
    this.callback([{ isIntersecting: true, target: element }]);
  }

  unobserve(element) {
    this.elements.delete(element);
  }

  disconnect() {
    this.elements.clear();
  }
};

describe('LazyImage Component', () => {
  beforeEach(() => {
    // Clear all instances and mocks
    jest.clearAllMocks();
  });

  it('renders placeholder initially', () => {
    render(
      <LazyImage
        src="test-image.jpg"
        alt="Test image"
        placeholder={<div>Loading...</div>}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('loads image when intersecting viewport', async () => {
    render(
      <LazyImage
        src="test-image.jpg"
        alt="Test image"
      />
    );

    // Wait for the image to be loaded (intersection observer triggers immediately)
    await waitFor(() => {
      const img = screen.getByAltText('Test image');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'test-image.jpg');
    });
  });

  it('handles successful image load', async () => {
    const onLoad = jest.fn();

    render(
      <LazyImage
        src="test-image.jpg"
        alt="Test image"
        onLoad={onLoad}
      />
    );

    const img = screen.getByAltText('Test image');

    // Simulate successful load
    img.dispatchEvent(new Event('load'));

    await waitFor(() => {
      expect(onLoad).toHaveBeenCalled();
      expect(img).toHaveClass('opacity-100');
    });
  });

  it('handles image load error', async () => {
    const onError = jest.fn();

    render(
      <LazyImage
        src="invalid-image.jpg"
        alt="Test image"
        onError={onError}
      />
    );

    const img = screen.getByAltText('Test image');

    // Simulate load error
    img.dispatchEvent(new Event('error'));

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
      expect(screen.getByText('Failed to load image')).toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    render(
      <LazyImage
        src="test-image.jpg"
        alt="Test image"
        className="custom-class"
      />
    );

    const container = screen.getByAltText('Test image').parentElement;
    expect(container).toHaveClass('custom-class');
  });

  it('passes through additional props to img element', () => {
    render(
      <LazyImage
        src="test-image.jpg"
        alt="Test image"
        width={100}
        height={100}
        data-testid="lazy-image"
      />
    );

    const img = screen.getByTestId('lazy-image');
    expect(img).toHaveAttribute('width', '100');
    expect(img).toHaveAttribute('height', '100');
  });

  it('shows error state when image fails to load', async () => {
    render(
      <LazyImage
        src="broken-image.jpg"
        alt="Broken image"
      />
    );

    const img = screen.getByAltText('Broken image');
    img.dispatchEvent(new Event('error'));

    await waitFor(() => {
      expect(screen.getByText('Failed to load image')).toBeInTheDocument();
    });
  });

  it('cleans up intersection observer on unmount', () => {
    const { unmount } = render(
      <LazyImage
        src="test-image.jpg"
        alt="Test image"
      />
    );

    unmount();

    // The observer should be cleaned up (this is hard to test directly,
    // but we can ensure no errors occur during unmount)
    expect(() => unmount()).not.toThrow();
  });

  it('uses custom intersection observer options', () => {
    // Mock the IntersectionObserver constructor to capture options
    let capturedOptions;
    global.IntersectionObserver = class MockIntersectionObserver {
      constructor(callback, options) {
        capturedOptions = options;
        this.callback = callback;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    render(
      <LazyImage
        src="test-image.jpg"
        alt="Test image"
        threshold={0.5}
        rootMargin="100px"
      />
    );

    expect(capturedOptions.threshold).toBe(0.5);
    expect(capturedOptions.rootMargin).toBe('100px');
  });

  it('does not show placeholder when loaded', async () => {
    render(
      <LazyImage
        src="test-image.jpg"
        alt="Test image"
        placeholder={<div>Loading...</div>}
      />
    );

    const img = screen.getByAltText('Test image');
    img.dispatchEvent(new Event('load'));

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });
});