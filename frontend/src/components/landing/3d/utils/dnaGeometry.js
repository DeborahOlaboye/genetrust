// Mathematical calculations for DNA helix geometry

import * as THREE from 'three';

/**
 * Creates helix points for DNA double strand
 * @param {number} radius - Radius of the helix
 * @param {number} height - Total height of the helix
 * @param {number} turns - Number of complete turns
 * @param {number} segments - Number of segments (resolution)
 * @returns {Array} Array of helix points with left/right strand positions
 */
export const createHelixPoints = (radius = 1, height = 8, turns = 4, segments = 200) => {
  const points = [];
  const step = height / segments;
  
  for (let i = 0; i <= segments; i++) {
    const y = i * step - height / 2;
    const angle = (i / segments) * turns * Math.PI * 2;
    
    // Left strand
    const x1 = Math.cos(angle) * radius;
    const z1 = Math.sin(angle) * radius;
    
    // Right strand (180 degrees offset)
    const x2 = Math.cos(angle + Math.PI) * radius;
    const z2 = Math.sin(angle + Math.PI) * radius;
    
    points.push({
      left: new THREE.Vector3(x1, y, z1),
      right: new THREE.Vector3(x2, y, z2),
      angle: angle,
      y: y,
      index: i
    });
  }
  
  return points;
};

/**
 * Creates base pair positions between two helix strands
 * @param {Array} helixPoints - Points from createHelixPoints
 * @param {number} spacing - Spacing between base pairs (show every Nth point)
 * @returns {Array} Array of base pair data
 */
export const createBasePairPositions = (helixPoints, spacing = 8) => {
  const basePairs = [];
  
  for (let i = 0; i < helixPoints.length; i += spacing) {
    const point = helixPoints[i];
    
    // Calculate midpoint between strands
    const midPoint = new THREE.Vector3()
      .addVectors(point.left, point.right)
      .multiplyScalar(0.5);
    
    // Calculate rotation to align base pair with strand direction
    const direction = new THREE.Vector3()
      .subVectors(point.right, point.left)
      .normalize();
    
    basePairs.push({
      position: midPoint,
      rotation: [0, 0, point.angle],
      leftEnd: point.left,
      rightEnd: point.right,
      angle: point.angle,
      index: i
    });
  }
  
  return basePairs;
};

/**
 * DNA Color palette from design
 */
export const DNA_COLORS = {
  PRIMARY_TEAL: '#34D399',
  PRIMARY_BLUE: '#8B5CF6', 
  DARK_BLUE: '#14102E',
  CYAN: '#F472B6',
  BACKGROUND_DARK: '#0B0B1D',
  WHITE: '#FFFFFF',
  GLOW_TEAL: '#34D399',
  GLOW_BLUE: '#8B5CF6'
};

/**
 * Default DNA helix configuration
 */
export const DNA_CONFIG = {
  DEFAULT_RADIUS: 1.2,
  DEFAULT_HEIGHT: 6,
  DEFAULT_TURNS: 3,
  DEFAULT_SEGMENTS: 150,
  BASE_PAIR_SPACING: 8,
  STRAND_THICKNESS: 0.05,
  BASE_PAIR_THICKNESS: 0.02,
  BASE_PAIR_LENGTH: 2,
  SPHERE_RADIUS: 0.08
};

/**
 * Animation configuration
 */
export const ANIMATION_CONFIG = {
  HELIX_ROTATION_SPEED: 0.008,
  BASE_PAIR_ROTATION_SPEED: 0.005,
  PRIVACY_SECTION_SPEED: 0.012,
  SCROLL_RESPONSIVENESS: 0.001,
  
  // Phase 2: Complex spiral animation
  SPIRAL_WITHIN_SPIRAL_SPEED: 0.012,
  HELIX_SPIRAL_SPEED: 0.006,
  BASE_PAIR_SPIRAL_SPEED: 0.015,
  SCROLL_MULTIPLIER: 2.0,
  WAVE_AMPLITUDE: 0.3,
  WAVE_FREQUENCY: 1.5
};

/**
 * Calculate spiral motion for base pairs within the helix twist
 * @param {number} time - Current time 
 * @param {number} baseIndex - Index of the base pair
 * @param {number} totalBases - Total number of base pairs
 * @param {number} helixRotation - Current helix rotation
 * @returns {Object} Spiral transformation data
 */
export const calculateSpiralWithinSpiral = (time, baseIndex, totalBases, helixRotation) => {
  // Calculate position along the helix (0 to 1)
  const normalizedPosition = baseIndex / totalBases;
  
  // Base spiral motion around the helix
  const spiralAngle = time * ANIMATION_CONFIG.BASE_PAIR_SPIRAL_SPEED + normalizedPosition * Math.PI * 4;
  
  // Additional rotation from main helix movement
  const helixInfluence = helixRotation * ANIMATION_CONFIG.SPIRAL_WITHIN_SPIRAL_SPEED;
  
  // Wave motion for organic feel
  const waveOffset = Math.sin(time * ANIMATION_CONFIG.WAVE_FREQUENCY + normalizedPosition * Math.PI * 2) * ANIMATION_CONFIG.WAVE_AMPLITUDE;
  
  return {
    rotation: spiralAngle + helixInfluence,
    offsetX: Math.cos(spiralAngle) * 0.1 + waveOffset,
    offsetZ: Math.sin(spiralAngle) * 0.1,
    scale: 1 + Math.sin(spiralAngle * 2) * 0.05 // Subtle scaling
  };
};

/**
 * Calculate scroll-responsive animation multiplier
 * @param {number} scrollProgress - Scroll progress (0 to 1)
 * @returns {number} Animation speed multiplier
 */
export const calculateScrollMultiplier = (scrollProgress) => {
  // Accelerate animation based on scroll
  return 1 + (scrollProgress * ANIMATION_CONFIG.SCROLL_MULTIPLIER);
};

/**
 * Calculate helix twist animation
 * @param {number} time - Current time
 * @param {number} scrollProgress - Scroll progress (0 to 1)
 * @returns {Object} Helix transformation data
 */
export const calculateHelixTwist = (time, scrollProgress = 0) => {
  const scrollMultiplier = calculateScrollMultiplier(scrollProgress);
  const rotationY = time * ANIMATION_CONFIG.HELIX_SPIRAL_SPEED * scrollMultiplier;
  
  return {
    rotationY,
    rotationX: Math.sin(time * 0.5) * 0.1, // Subtle wobble
    rotationZ: Math.cos(time * 0.3) * 0.05  // Very subtle twist
  };
};
