import React, { useState, useEffect, useRef } from 'react';

/**
 * LazyImage Component
 *
 * Lazy-loaded image with intersection observer
 *
 * Features:
 * - Lazy loading with IntersectionObserver
 * - Placeholder support
 * - Fade-in animation on load
 * - Error handling
 */

export const LazyImage = ({
  src,
  alt = '',
  placeholder = null,
  className = '',
  threshold = 0.1,
  rootMargin = '50px',
  onLoad,
  onError,
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [imageRef, setImageRef] = useState();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const observerRef = useRef(null);

  useEffect(() => {
    if (!imageRef) return;

    // Create intersection observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src);
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observerRef.current.observe(imageRef);

    return () => {
      if (observerRef.current && imageRef) {
        observerRef.current.unobserve(imageRef);
      }
    };
  }, [imageRef, src, threshold, rootMargin]);

  const handleLoad = () => {
    setLoaded(true);
    if (onLoad) onLoad();
  };

  const handleError = () => {
    setError(true);
    if (onError) onError();
  };

  return (
    <div ref={setImageRef} className={`relative ${className}`}>
      {!loaded && !error && placeholder && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800/20">
          {placeholder}
        </div>
      )}

      {imageSrc && !error && (
        <img
          src={imageSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
          {...props}
        />
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800/20 text-gray-400 text-sm">
          Failed to load image
        </div>
      )}
    </div>
  );
};

export default LazyImage;
