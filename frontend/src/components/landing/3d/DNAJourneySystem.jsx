// Core DNA Galaxy Journey System - Inside the DNA tunnel experience

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { DNA_COLORS } from './utils/dnaGeometry.js';

/**
 * DNAJourneySystem Component
 * Creates the massive DNA tunnel that users travel through
 * Camera moves down the center of the helix, looking outward at DNA walls
 */
const DNAJourneySystem = ({ 
  scrollProgress = 0,
  onSectionChange,
  isMobile = false 
}) => {
  const groupRef = useRef();
  const { camera, size } = useThree();
  
  // Journey configuration
  const journeyConfig = useMemo(() => ({
    // DNA tunnel parameters
    tunnelRadius: isMobile ? 8 : 12,           // Radius of DNA tunnel walls
    tunnelHeight: isMobile ? 800 : 1200,       // Total height of DNA journey
    helixTurns: isMobile ? 8 : 12,             // Number of complete helix turns
    segments: isMobile ? 200 : 400,            // DNA resolution (lower for mobile)
    basePairSpacing: isMobile ? 15 : 10,       // Distance between base pairs
    
    // Camera journey parameters
    rotationsPerHeight: 2.5,                   // 2-3 rotations per screen height
    cameraRadius: 0.5                          // How far camera is from center axis
  }), [isMobile]);
  
  // Generate the massive DNA tunnel geometry
  const dnaGeometry = useMemo(() => {
    const { tunnelRadius, tunnelHeight, helixTurns, segments } = journeyConfig;
    
    // Create left and right DNA strands
    const leftStrandPoints = [];
    const rightStrandPoints = [];
    const basePairs = [];
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = -tunnelHeight * t; // Moving down (negative Y)
      const angle = t * helixTurns * Math.PI * 2;
      
      // Left strand (major groove)
      const leftX = Math.cos(angle) * tunnelRadius;
      const leftZ = Math.sin(angle) * tunnelRadius;
      leftStrandPoints.push(new THREE.Vector3(leftX, y, leftZ));
      
      // Right strand (180 degrees offset)
      const rightAngle = angle + Math.PI;
      const rightX = Math.cos(rightAngle) * tunnelRadius;
      const rightZ = Math.sin(rightAngle) * tunnelRadius;
      rightStrandPoints.push(new THREE.Vector3(rightX, y, rightZ));
      
      // Base pairs (connecting the strands)
      if (i % journeyConfig.basePairSpacing === 0) {
        basePairs.push({
          left: new THREE.Vector3(leftX, y, leftZ),
          right: new THREE.Vector3(rightX, y, rightZ),
          center: new THREE.Vector3(0, y, 0),
          angle: angle
        });
      }
    }
    
    return { leftStrandPoints, rightStrandPoints, basePairs };
  }, [journeyConfig]);
  
  // Camera positioning system - traveling down DNA center
  useFrame(() => {
    if (!camera) return;
    
    const { tunnelHeight, rotationsPerHeight, cameraRadius } = journeyConfig;
    
    // Calculate camera position along the DNA journey
    const journeyY = -scrollProgress * tunnelHeight;
    const rotationAngle = scrollProgress * rotationsPerHeight * Math.PI * 2;
    
    // Camera travels down center axis with slight spiral motion
    const cameraX = Math.cos(-rotationAngle) * cameraRadius; // Counter-clockwise
    const cameraZ = Math.sin(-rotationAngle) * cameraRadius;
    
    // Position camera inside the DNA tunnel
    camera.position.set(cameraX, journeyY, cameraZ);
    
    // Camera looks slightly ahead down the tunnel
    const lookAheadY = journeyY - 10;
    const lookAheadX = Math.cos(-rotationAngle) * (cameraRadius * 0.5);
    const lookAheadZ = Math.sin(-rotationAngle) * (cameraRadius * 0.5);
    
    camera.lookAt(lookAheadX, lookAheadY, lookAheadZ);
    
    // Notify parent of section changes
    if (onSectionChange) {
      let newSection = 'hero';
      if (scrollProgress >= 0.85) newSection = 'cta';
      else if (scrollProgress >= 0.55) newSection = 'privacy';
      else if (scrollProgress >= 0.25) newSection = 'howItWorks';
      
      onSectionChange(newSection);
    }
  });
  
  // DNA Strand Component
  const DNAStrand = ({ points, color, opacity = 0.8 }) => {
    const curve = useMemo(() => new THREE.CatmullRomCurve3(points), [points]);
    const tubeGeometry = useMemo(() => 
      new THREE.TubeGeometry(curve, points.length, isMobile ? 0.3 : 0.5, 16, false), 
      [curve, points.length]
    );
    
    return (
      <mesh geometry={tubeGeometry}>
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          emissive={color}
          emissiveIntensity={0.2}
          roughness={0.3}
          metalness={0.4}
        />
      </mesh>
    );
  };
  
  // Base Pair Component
  const BasePair = ({ left, right, center, angle, index }) => {
    // Simplified version without complex animations
    const direction = new THREE.Vector3().subVectors(right, left).normalize();
    const basePairLength = left.distanceTo(right);
    
    return (
      <group position={center}>
        {/* Central connecting tube */}
        <mesh rotation={[0, 0, angle]}>
          <cylinderGeometry args={[isMobile ? 0.1 : 0.15, isMobile ? 0.1 : 0.15, basePairLength, 8]} />
          <meshStandardMaterial
            color={DNA_COLORS.PRIMARY_TEAL}
            transparent
            opacity={0.7}
            emissive={DNA_COLORS.PRIMARY_TEAL}
            emissiveIntensity={0.3}
          />
        </mesh>
        
        {/* Left nucleotide */}
        <mesh position={[-basePairLength/2, 0, 0]}>
          <sphereGeometry args={[isMobile ? 0.4 : 0.6, 16, 16]} />
          <meshStandardMaterial
            color={DNA_COLORS.PRIMARY_BLUE}
            transparent
            opacity={0.8}
            emissive={DNA_COLORS.PRIMARY_BLUE}
            emissiveIntensity={0.4}
          />
        </mesh>
        
        {/* Right nucleotide */}
        <mesh position={[basePairLength/2, 0, 0]}>
          <sphereGeometry args={[isMobile ? 0.4 : 0.6, 16, 16]} />
          <meshStandardMaterial
            color={DNA_COLORS.CYAN}
            transparent
            opacity={0.8}
            emissive={DNA_COLORS.CYAN}
            emissiveIntensity={0.4}
          />
        </mesh>
      </group>
    );
  };
  
  return (
    <group ref={groupRef}>
      {/* Left DNA Strand - Tunnel Wall */}
      <DNAStrand 
        points={dnaGeometry.leftStrandPoints} 
        color={DNA_COLORS.PRIMARY_TEAL}
        opacity={0.9}
      />
      
      {/* Right DNA Strand - Tunnel Wall */}
      <DNAStrand 
        points={dnaGeometry.rightStrandPoints} 
        color={DNA_COLORS.PRIMARY_BLUE}
        opacity={0.9}
      />
      
      {/* Base Pairs - Tunnel Rungs */}
      {dnaGeometry.basePairs.map((basePair, index) => (
        <BasePair
          key={index}
          left={basePair.left}
          right={basePair.right}
          center={basePair.center}
          angle={basePair.angle}
          index={index}
        />
      ))}
      
      {/* Galaxy particle effects - Simple version for now */}
    </group>
  );
};

export default DNAJourneySystem;
