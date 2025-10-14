// Individual DNA strand component (the backbone of the DNA helix)

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DNA_COLORS, DNA_CONFIG } from './utils/dnaGeometry.js';

/**
 * DNAStrand Component
 * Represents one of the two backbones of the DNA double helix
 * Creates a smooth tube geometry that follows the helical path
 * 
 * @param {Array} points - Array of helix points defining the strand path
 * @param {string} color - Hex color for the strand
 * @param {number} offset - Offset for left (0) or right (1) strand
 * @param {number} thickness - Thickness of the strand tube
 * @param {number} opacity - Opacity of the strand material
 * @param {number} emissiveIntensity - Glow intensity
 * @param {boolean} animated - Enable strand-specific animations
 * @param {number} animationSpeed - Speed of strand animation
 */
const DNAStrand = ({ 
  points = [], 
  color = DNA_COLORS.PRIMARY_TEAL,
  offset = 0, // 0 for left strand, 1 for right strand
  thickness = DNA_CONFIG.STRAND_THICKNESS,
  opacity = 0.9,
  emissiveIntensity = 0.1,
  animated = true,
  animationSpeed = 0.002
}) => {
  const meshRef = useRef();

  // Generate strand geometry from helix points
  const strandGeometry = useMemo(() => {
    if (!points || points.length === 0) return null;

    // Create path points for this specific strand (left or right)
    const strandPoints = points.map(point => {
      // Offset determines which strand we're drawing
      const strandPosition = offset === 0 ? point.left : point.right;
      return new THREE.Vector3(
        strandPosition.x,
        strandPosition.y,
        strandPosition.z
      );
    });

    // Create a smooth curve through the strand points
    const curve = new THREE.CatmullRomCurve3(strandPoints);
    
    // Generate tube geometry along the curve
    const tubeGeometry = new THREE.TubeGeometry(
      curve,
      points.length * 2, // Number of segments along the curve
      thickness, // Radius of the tube
      16, // Number of segments around the tube (radial segments)
      false // Don't close the tube
    );

    return tubeGeometry;
  }, [points, offset, thickness]);

  // Strand-specific animation (subtle pulsing and color shifts)
  useFrame((state) => {
    if (animated && meshRef.current) {
      const time = state.clock.elapsedTime;
      
      // Subtle pulsing effect based on strand offset
      const pulseFactor = 1 + Math.sin(time * 2 + offset * Math.PI) * 0.05;
      meshRef.current.scale.setScalar(pulseFactor);
      
      // Subtle emissive intensity variation
      const emissiveVariation = emissiveIntensity + 
        Math.sin(time * animationSpeed * 100 + offset * Math.PI * 2) * 0.02;
      
      if (meshRef.current.material) {
        meshRef.current.material.emissiveIntensity = Math.max(0, emissiveVariation);
      }
    }
  });

  // Don't render if no geometry
  if (!strandGeometry) return null;

  return (
    <mesh ref={meshRef} geometry={strandGeometry}>
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        emissive={color}
        emissiveIntensity={emissiveIntensity}
        roughness={0.2}
        metalness={0.3}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

export default DNAStrand;
