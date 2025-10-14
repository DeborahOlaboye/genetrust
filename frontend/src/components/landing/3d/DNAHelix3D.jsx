// Main DNA helix component that combines strands and base pairs

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import DNAStrand from './DNAStrand.jsx';
import BasePair from './BasePair.jsx';
import { 
  createHelixPoints, 
  createBasePairPositions, 
  DNA_COLORS, 
  DNA_CONFIG,
  ANIMATION_CONFIG,
  calculateHelixTwist
} from './utils/dnaGeometry.js';

/**
 * DNAHelix3D Component
 * Main component that renders a complete DNA double helix
 * 
 * @param {Array} position - [x, y, z] position in 3D space
 * @param {number} scale - Scale multiplier for the entire helix
 * @param {boolean} autoRotate - Enable automatic rotation
 * @param {number} rotationSpeed - Speed of rotation
 * @param {Object} config - Custom configuration overrides
 * @param {boolean} showBasePairs - Whether to render base pairs
 * @param {boolean} enableAnimation - Enable animations
 */
const DNAHelix3D = ({ 
  position = [0, 0, 0], 
  scale = 1,
  autoRotate = true,
  rotationSpeed = ANIMATION_CONFIG.HELIX_ROTATION_SPEED,
  config = {},
  showBasePairs = true,
  enableAnimation = true
}) => {
  const groupRef = useRef();
  
  // Merge custom config with defaults
  const helixConfig = {
    ...DNA_CONFIG,
    ...config
  };
  
  // Generate helix points using mathematical calculations
  const helixPoints = useMemo(() => 
    createHelixPoints(
      helixConfig.DEFAULT_RADIUS,
      helixConfig.DEFAULT_HEIGHT, 
      helixConfig.DEFAULT_TURNS, 
      helixConfig.DEFAULT_SEGMENTS
    ), 
    [helixConfig]
  );
  
  // Generate base pair positions
  const basePairPositions = useMemo(() => 
    createBasePairPositions(helixPoints, helixConfig.BASE_PAIR_SPACING),
    [helixPoints, helixConfig.BASE_PAIR_SPACING]
  );
  
  // Phase 2: Complex spiral animation - entire helix twist
  useFrame((state) => {
    if (groupRef.current && autoRotate && enableAnimation) {
      const time = state.clock.elapsedTime;
      
      // Get scroll progress (will be passed from parent component later)
      const scrollProgress = 0; // TODO: Connect to scroll in Phase 3
      
      // Calculate complex helix twist motion
      const helixTwist = calculateHelixTwist(time, scrollProgress);
      
      // Apply the complex spiral motion to the entire helix
      groupRef.current.rotation.y = helixTwist.rotationY;
      groupRef.current.rotation.x = helixTwist.rotationX;
      groupRef.current.rotation.z = helixTwist.rotationZ;
      
      // Store rotation data for base pairs to access
      groupRef.current.userData = {
        currentTime: time,
        helixRotation: helixTwist.rotationY,
        scrollProgress
      };
    }
  });
  
  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Left DNA Strand */}
      <DNAStrand 
        points={helixPoints} 
        color={DNA_COLORS.PRIMARY_TEAL} 
        offset={0}
        thickness={helixConfig.STRAND_THICKNESS}
        opacity={0.9}
        emissiveIntensity={0.1}
      />
      
      {/* Right DNA Strand */}
      <DNAStrand 
        points={helixPoints} 
        color={DNA_COLORS.PRIMARY_BLUE} 
        offset={1}
        thickness={helixConfig.STRAND_THICKNESS}
        opacity={0.9}
        emissiveIntensity={0.1}
      />
      
      {/* Base Pairs (the rungs connecting the strands) */}
      {showBasePairs && basePairPositions.map((basePair, index) => (
        <BasePair
          key={`basepair-${index}`}
          position={[basePair.position.x, basePair.position.y, basePair.position.z]}
          rotation={basePair.rotation}
          scale={0.8}
          animationSpeed={ANIMATION_CONFIG.BASE_PAIR_ROTATION_SPEED}
          enableAnimation={enableAnimation}
          baseIndex={index}
          totalBases={basePairPositions.length}
        />
      ))}
    </group>
  );
};

export default DNAHelix3D;
