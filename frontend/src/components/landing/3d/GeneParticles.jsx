// Subtle DNA-inspired particle field for ambient motion
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/**
 * GeneParticles
 * Renders a field of faint particles distributed in helical bands around the scene center.
 * Particles gently drift and pulse to evoke DNA/genes ambience.
 */
const GeneParticles = ({
  count = 800,
  radius = 8,
  height = 12,
  turns = 6,
  colorA = '#8B5CF6',
  colorB = '#F472B6',
  opacity = 0.25,
}) => {
  const pointsRef = useRef();

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const t = i / count; // 0..1
      const angle = t * turns * Math.PI * 2;
      const r = radius * (0.7 + 0.3 * Math.random());
      const y = (t - 0.5) * height + (Math.random() - 0.5) * 1.0;

      // Helical distribution around center
      const x = Math.cos(angle) * r + (Math.random() - 0.5) * 0.4;
      const z = Math.sin(angle) * r + (Math.random() - 0.5) * 0.4;

      positions[i * 3 + 0] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Gradient color between A and B
      color.set(colorA).lerp(new THREE.Color(colorB), t);
      colors[i * 3 + 0] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    return { positions, colors };
  }, [count, radius, height, turns, colorA, colorB]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!pointsRef.current) return;

    // Gentle rotation + vertical drift, very subtle
    pointsRef.current.rotation.y = t * 0.02;
    pointsRef.current.position.y = Math.sin(t * 0.25) * 0.2;
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={positions.length / 3}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          array={colors}
          count={colors.length / 3}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default GeneParticles;
