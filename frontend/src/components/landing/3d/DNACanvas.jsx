// Canvas wrapper component for DNA 3D visualization

import React from 'react';
import { Canvas } from '@react-three/fiber';
import Scene3D from './Scene3D.jsx';
import DNAHelix3D from './DNAHelix3D.jsx';
import { ANIMATION_CONFIG } from './utils/dnaGeometry.js';

/**
 * DNACanvas Component
 * Wrapper component that sets up the Canvas and renders DNA helix
 * 
 * @param {string} className - CSS classes for the container
 * @param {Array} position - DNA helix position [x, y, z]
 * @param {Array} cameraPosition - Camera position [x, y, z]
 * @param {boolean} autoRotate - Enable DNA rotation
 * @param {number} rotationSpeed - Speed of DNA rotation
 * @param {Object} helixConfig - Configuration for DNA helix
 * @param {boolean} showBasePairs - Whether to show base pairs
 * @param {boolean} enableControls - Enable orbit controls (for development)
 * @param {Object} lighting - Custom lighting configuration
 * @param {Object} canvasProps - Additional Canvas props
 */
const DNACanvas = ({ 
  className = '',
  position = [0, 0, 0],
  cameraPosition = [8, 0, 8],
  autoRotate = true,
  rotationSpeed = ANIMATION_CONFIG.HELIX_ROTATION_SPEED,
  helixConfig = {},
  showBasePairs = true,
  enableControls = false,
  lighting = {},
  canvasProps = {}
}) => {
  
  // Default canvas configuration optimized for DNA visualization
  const defaultCanvasProps = {
    shadows: true,
    dpr: [1, 2], // Device pixel ratio for crisp rendering
    gl: { 
      antialias: true,
      alpha: true, // Transparent background
      powerPreference: "high-performance"
    },
    camera: { 
      position: cameraPosition,
      fov: 45,
      near: 0.1,
      far: 1000
    },
    ...canvasProps
  };

  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas {...defaultCanvasProps}>
        <Scene3D 
          enableControls={enableControls}
          lighting={lighting}
        >
          <DNAHelix3D 
            position={position}
            autoRotate={autoRotate}
            rotationSpeed={rotationSpeed}
            config={helixConfig}
            showBasePairs={showBasePairs}
            enableAnimation={true}
          />
        </Scene3D>
      </Canvas>
    </div>
  );
};

// Hero Section DNA Component (larger, positioned right)
export const HeroDNA = ({ className = '' }) => {
  return (
    <DNACanvas 
      className={className}
      position={[0, 0, 0]}
      cameraPosition={[6, 2, 6]}
      autoRotate={true}
      rotationSpeed={ANIMATION_CONFIG.HELIX_ROTATION_SPEED}
      showBasePairs={true}
    />
  );
};

// Privacy Section DNA Component (smaller, different angle)
export const PrivacyDNA = ({ className = '' }) => {
  return (
    <DNACanvas 
      className={className}
      position={[0, 0, 0]}
      cameraPosition={[4, 1, 4]}
      autoRotate={true}
      rotationSpeed={ANIMATION_CONFIG.PRIVACY_SECTION_SPEED}
      showBasePairs={true}
      helixConfig={{
        DEFAULT_HEIGHT: 4, // Smaller helix
        DEFAULT_TURNS: 2,   // Fewer turns
        BASE_PAIR_SPACING: 10 // Fewer base pairs
      }}
    />
  );
};

export default DNACanvas;
