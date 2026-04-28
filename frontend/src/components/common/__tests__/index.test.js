import {
  Button,
  ErrorBoundary,
  ErrorDisplay,
  LazyImage,
  LoadingSpinner,
  SkeletonLoader,
} from '../index';

describe('components/common barrel export', () => {
  it('exports Button', () => {
    expect(Button).toBeDefined();
    expect(typeof Button).toBe('function');
    expect(Button.displayName).toBe('Button');
  });

  it('exports ErrorBoundary', () => {
    expect(ErrorBoundary).toBeDefined();
    expect(ErrorBoundary.displayName).toBe('ErrorBoundary');
  });

  it('exports ErrorDisplay', () => {
    expect(ErrorDisplay).toBeDefined();
    expect(typeof ErrorDisplay).toBe('function');
  });

  it('exports LazyImage', () => {
    expect(LazyImage).toBeDefined();
    expect(typeof LazyImage).toBe('function');
  });

  it('exports LoadingSpinner', () => {
    expect(LoadingSpinner).toBeDefined();
    expect(typeof LoadingSpinner).toBe('function');
    expect(LoadingSpinner.displayName).toBe('LoadingSpinner');
  });

  it('LoadingSpinner has label prop defined in propTypes', () => {
    expect(LoadingSpinner.propTypes).toHaveProperty('label');
  });

  it('exports SkeletonLoader', () => {
    expect(SkeletonLoader).toBeDefined();
    expect(typeof SkeletonLoader).toBe('function');
    expect(SkeletonLoader.displayName).toBe('SkeletonLoader');
  });

  it('SkeletonLoader has gap prop defined in propTypes', () => {
    expect(SkeletonLoader.propTypes).toHaveProperty('gap');
  });
});
