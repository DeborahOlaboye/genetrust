// Simple 3D scene setup that works

import React from 'react';
import GeneParticles from './GeneParticles.jsx';

/**
 * Scene3D Component
 * Simple, working 3D environment setup
 */
const Scene3D = ({ children, isMobile = false }) => {
  return (
    <>
      {/* Basic lighting setup */}
      <ambientLight intensity={0.4} color="#8B5CF6" />
      <directionalLight
        position={[10, 10, 5]}
        intensity={0.8}
        color="#F472B6"
        castShadow={!isMobile}
      />
      <directionalLight
        position={[-10, -10, -5]}
        intensity={0.4}
        color="#8B5CF6"
      />
      <pointLight
        position={[0, 0, 10]}
        intensity={0.6}
        color="#34D399"
        distance={100}
        decay={2}
      />
      
      {/* Subtle DNA-inspired particle field */}
      <GeneParticles count={700} radius={10} height={16} turns={8} opacity={0.22} />

      {/* Children components */}
      {children}
    </>
  );
};

export default Scene3D;








// // 3D scene setup with lighting and environment for DNA journey

// import React from 'react';
// import { OrbitControls } from '@react-three/drei';

// /**
//  * Scene3D Component
//  * Sets up the 3D environment with appropriate lighting and controls
//  * Optimized for DNA tunnel journey experience
//  */
// const Scene3D = ({ 
//   children, 
//   enableControls = false, 
//   lighting = {},
//   isMobile = false 
// }) => {
  
//   // Default lighting configuration for DNA tunnel
//   const defaultLighting = {
//     ambientIntensity: 0.4,
//     ambientColor: '#2DD4BF',
//     directionalIntensity: 0.8,
//     directionalColor: '#5594E0',
//     pointLightIntensity: 0.6,
//     pointLightColor: '#20A7BD',
//     ...lighting
//   };

//   return (
//     <>
//       {/* Ambient lighting for overall illumination */}
//       <ambientLight 
//         intensity={defaultLighting.ambientIntensity} 
//         color={defaultLighting.ambientColor} 
//       />
      
//       {/* Primary directional light */}
//       <directionalLight
//         position={[10, 10, 5]}
//         intensity={defaultLighting.directionalIntensity}
//         color={defaultLighting.directionalColor}
//         castShadow={!isMobile} // Disable shadows on mobile for performance
//         shadow-mapSize-width={isMobile ? 512 : 1024}
//         shadow-mapSize-height={isMobile ? 512 : 1024}
//         shadow-camera-far={100}
//         shadow-camera-left={-50}
//         shadow-camera-right={50}
//         shadow-camera-top={50}
//         shadow-camera-bottom={-50}
//       />
      
//       {/* Secondary directional light for fill */}
//       <directionalLight
//         position={[-10, -10, -5]}
//         intensity={defaultLighting.directionalIntensity * 0.5}
//         color={defaultLighting.directionalColor}
//       />
      
//       {/* Point lights for DNA glow effects */}
//       <pointLight
//         position={[0, 0, 10]}
//         intensity={defaultLighting.pointLightIntensity}
//         color={defaultLighting.pointLightColor}
//         distance={100}
//         decay={2}
//       />
      
//       <pointLight
//         position={[0, -20, -10]}
//         intensity={defaultLighting.pointLightIntensity * 0.7}
//         color={defaultLighting.ambientColor}
//         distance={80}
//         decay={2}
//       />
      
//       {/* Rim lighting for depth */}
//       <pointLight
//         position={[30, 0, 0]}
//         intensity={0.3}
//         color="#37A36B"
//         distance={150}
//         decay={1}
//       />
      
//       <pointLight
//         position={[-30, 0, 0]}
//         intensity={0.3}
//         color="#E0BA1B"
//         distance={150}
//         decay={1}
//       />
      
//       {/* Development controls (disabled for production DNA journey) */}
//       {enableControls && (
//         <OrbitControls
//           enablePan={false}
//           enableZoom={true}
//           enableRotate={true}
//           maxDistance={100}
//           minDistance={5}
//           maxPolarAngle={Math.PI}
//           minPolarAngle={0}
//         />
//       )}
      
//       {/* Children components (DNA system, etc.) */}
//       {children}
//     </>
//   );
// };

// export default Scene3D;














// // 3D scene setup with lighting, camera, and environment

// import React from 'react';
// import { OrbitControls } from '@react-three/drei';
// import { DNA_COLORS } from './utils/dnaGeometry.js';

// /**
//  * Scene3D Component
//  * Sets up the 3D environment with proper lighting for DNA visualization
//  * 
//  * @param {React.ReactNode} children - 3D components to render
//  * @param {boolean} enableControls - Enable orbit controls for development
//  * @param {boolean} autoRotateControls - Auto-rotate camera controls
//  * @param {Object} lighting - Custom lighting configuration
//  */
// const Scene3D = ({ 
//   children, 
//   enableControls = false,
//   autoRotateControls = false,
//   lighting = {}
// }) => {
  
//   // Default lighting configuration based on design
//   const defaultLighting = {
//     ambient: {
//       intensity: 0.3,
//       color: DNA_COLORS.DARK_BLUE
//     },
//     directional: {
//       position: [10, 10, 5],
//       intensity: 0.8,
//       color: DNA_COLORS.WHITE,
//       castShadow: true
//     },
//     point: {
//       position: [-10, -10, -5],
//       intensity: 0.5,
//       color: DNA_COLORS.PRIMARY_TEAL,
//       distance: 50,
//       decay: 1
//     },
//     spot: {
//       position: [0, 10, 0],
//       angle: 0.3,
//       penumbra: 0.5,
//       intensity: 0.6,
//       color: DNA_COLORS.PRIMARY_BLUE,
//       castShadow: true,
//       distance: 50,
//       decay: 1
//     }
//   };

//   // Merge custom lighting with defaults
//   const finalLighting = {
//     ambient: { ...defaultLighting.ambient, ...lighting.ambient },
//     directional: { ...defaultLighting.directional, ...lighting.directional },
//     point: { ...defaultLighting.point, ...lighting.point },
//     spot: { ...defaultLighting.spot, ...lighting.spot }
//   };

//   return (
//     <>
//       {/* Ambient Light - Overall base illumination */}
//       <ambientLight 
//         intensity={finalLighting.ambient.intensity} 
//         color={finalLighting.ambient.color} 
//       />
      
//       {/* Directional Light - Main lighting (like sun) */}
//       <directionalLight 
//         position={finalLighting.directional.position}
//         intensity={finalLighting.directional.intensity}
//         color={finalLighting.directional.color}
//         castShadow={finalLighting.directional.castShadow}
//         shadow-mapSize-width={2048}
//         shadow-mapSize-height={2048}
//         shadow-camera-far={50}
//         shadow-camera-left={-10}
//         shadow-camera-right={10}
//         shadow-camera-top={10}
//         shadow-camera-bottom={-10}
//       />
      
//       {/* Point Light - Teal accent lighting */}
//       <pointLight 
//         position={finalLighting.point.position}
//         intensity={finalLighting.point.intensity}
//         color={finalLighting.point.color}
//         distance={finalLighting.point.distance}
//         decay={finalLighting.point.decay}
//       />
      
//       {/* Spot Light - Blue focused lighting */}
//       <spotLight
//         position={finalLighting.spot.position}
//         angle={finalLighting.spot.angle}
//         penumbra={finalLighting.spot.penumbra}
//         intensity={finalLighting.spot.intensity}
//         color={finalLighting.spot.color}
//         castShadow={finalLighting.spot.castShadow}
//         distance={finalLighting.spot.distance}
//         decay={finalLighting.spot.decay}
//         shadow-mapSize-width={1024}
//         shadow-mapSize-height={1024}
//       />
      
//       {/* Additional accent lights for glow effect */}
//       <pointLight 
//         position={[5, 0, 5]}
//         intensity={0.3}
//         color={DNA_COLORS.CYAN}
//         distance={20}
//         decay={2}
//       />
      
//       <pointLight 
//         position={[-5, 0, -5]}
//         intensity={0.3}
//         color={DNA_COLORS.GLOW_TEAL}
//         distance={20}
//         decay={2}
//       />

//       {/* Render children (DNA components) */}
//       {children}
      
//       {/* Optional: OrbitControls for development/testing */}
//       {enableControls && (
//         <OrbitControls 
//           enableZoom={true}
//           enablePan={true}
//           autoRotate={autoRotateControls}
//           autoRotateSpeed={1}
//           enableDamping
//           dampingFactor={0.05}
//           minDistance={2}
//           maxDistance={20}
//           minPolarAngle={Math.PI / 6}
//           maxPolarAngle={Math.PI - Math.PI / 6}
//         />
//       )}
//     </>
//   );
// };

// export default Scene3D;
