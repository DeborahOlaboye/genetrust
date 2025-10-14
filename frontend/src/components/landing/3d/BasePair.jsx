// Individual DNA base pair component (the rungs of the DNA ladder)

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DNA_COLORS, DNA_CONFIG, calculateSpiralWithinSpiral } from './utils/dnaGeometry.js';

/**
 * BasePair Component
 * Represents a single base pair (rung) of the DNA ladder
 * Phase 2: Now includes spiral-within-spiral motion
 * 
 * @param {Array} position - [x, y, z] position in 3D space
 * @param {Array} rotation - [x, y, z] rotation in radians
 * @param {number} scale - Scale multiplier
 * @param {number} animationSpeed - Speed of individual base pair rotation
 * @param {boolean} enableAnimation - Whether to animate this base pair
 * @param {number} baseIndex - Index of this base pair in the helix
 * @param {number} totalBases - Total number of base pairs
 */
const BasePair = ({ 
  position = [0, 0, 0], 
  rotation = [0, 0, 0], 
  scale = 1,
  animationSpeed = DNA_CONFIG.BASE_PAIR_ROTATION_SPEED,
  enableAnimation = true,
  baseIndex = 0,
  totalBases = 1
}) => {
  const meshRef = useRef();
  const groupRef = useRef();
  const leftSphereRef = useRef();
  const rightSphereRef = useRef();
  
  // Phase 2: Complex spiral-within-spiral animation
  useFrame((state) => {
    if (enableAnimation && groupRef.current && meshRef.current) {
      const time = state.clock.elapsedTime;
      
      // Get helix rotation data from parent (passed via scene graph)
      let helixRotation = 0;
      let currentTime = time;
      
      // Try to get data from parent helix component
      let parent = groupRef.current.parent;
      while (parent && !parent.userData?.helixRotation) {
        parent = parent.parent;
      }
      
      if (parent?.userData) {
        helixRotation = parent.userData.helixRotation || 0;
        currentTime = parent.userData.currentTime || time;
      }
      
      // Calculate spiral-within-spiral motion
      const spiralData = calculateSpiralWithinSpiral(
        currentTime, 
        baseIndex, 
        totalBases, 
        helixRotation
      );
      
      // Apply spiral rotation to the base pair
      meshRef.current.rotation.z = spiralData.rotation;
      
      // Apply subtle positional offset for organic motion
      groupRef.current.position.x = position[0] + spiralData.offsetX;
      groupRef.current.position.z = position[2] + spiralData.offsetZ;
      
      // Apply subtle scaling
      const spiralScale = scale * spiralData.scale;
      groupRef.current.scale.setScalar(spiralScale);
      
      // Enhanced pulsing effect for spheres
      if (leftSphereRef.current && rightSphereRef.current) {
        const pulse = 1 + Math.sin(currentTime * 3 + baseIndex * 0.5) * 0.08;
        leftSphereRef.current.scale.setScalar(pulse);
        rightSphereRef.current.scale.setScalar(pulse * 0.95); // Slightly different rhythm
      }
    }
  });
  
  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <group ref={meshRef}>
        {/* Main base pair cylinder (the connecting rung) */}
        <mesh>
          <cylinderGeometry 
            args={[
              DNA_CONFIG.BASE_PAIR_THICKNESS, 
              DNA_CONFIG.BASE_PAIR_THICKNESS, 
              DNA_CONFIG.BASE_PAIR_LENGTH, 
              8
            ]} 
          />
          <meshStandardMaterial 
            color={DNA_COLORS.PRIMARY_TEAL}
            transparent 
            opacity={0.8}
            emissive={DNA_COLORS.PRIMARY_TEAL}
            emissiveIntensity={0.2}
            roughness={0.3}
            metalness={0.1}
          />
        </mesh>
        
        {/* Left base (adenine/thymine or guanine/cytosine) */}
        <mesh 
          ref={leftSphereRef}
          position={[-DNA_CONFIG.BASE_PAIR_LENGTH / 2, 0, 0]}
        >
          <sphereGeometry args={[DNA_CONFIG.SPHERE_RADIUS, 16, 16]} />
          <meshStandardMaterial 
            color={DNA_COLORS.PRIMARY_BLUE}
            transparent 
            opacity={0.9}
            emissive={DNA_COLORS.PRIMARY_BLUE}
            emissiveIntensity={0.3}
            roughness={0.2}
            metalness={0.2}
          />
        </mesh>
        
        {/* Right base (complementary base) */}
        <mesh 
          ref={rightSphereRef}
          position={[DNA_CONFIG.BASE_PAIR_LENGTH / 2, 0, 0]}
        >
          <sphereGeometry args={[DNA_CONFIG.SPHERE_RADIUS, 16, 16]} />
          <meshStandardMaterial 
            color={DNA_COLORS.CYAN}
            transparent 
            opacity={0.9}
            emissive={DNA_COLORS.CYAN}
            emissiveIntensity={0.3}
            roughness={0.2}
            metalness={0.2}
          />
        </mesh>
      </group>
    </group>
  );
};

export default BasePair;
