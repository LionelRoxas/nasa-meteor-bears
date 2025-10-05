import * as THREE from 'three';
import getStarfield from './getStarfield';

export class EnhancedEarth {
  public earthGroup: THREE.Group;
  public earthMesh!: THREE.Mesh;
  public lightsMesh!: THREE.Mesh;
  public cloudsMesh!: THREE.Mesh;
  public glowMesh!: THREE.Mesh;
  public stars!: THREE.Points;
  
  constructor(scene: THREE.Scene) {
    this.earthGroup = new THREE.Group();
    this.earthGroup.rotation.z = -23.4 * Math.PI / 180; // Earth's axial tilt
    scene.add(this.earthGroup);
    
    this.createEarthLayers();
    this.createStarfield(scene);
  }
  
  private createEarthLayers() {
    const loader = new THREE.TextureLoader();
    // Try using BufferGeometry with custom vertex generation for perfect smoothness
    const radius = 1;
    const widthSegments = 128;
    const heightSegments = 128;
    const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
    
    // Force geometry to use smooth normals
    geometry.computeVertexNormals();
    
    // Main Earth surface - enhanced for more prominent land features
    const earthMaterial = new THREE.MeshLambertMaterial({
      // Enhanced Earth colors for more prominent land
      color: 0x234587, // More vibrant blue-green for land/ocean contrast
      // Force smooth shading to eliminate any edge artifacts
      flatShading: false,
      side: THREE.FrontSide, // Only render front faces
    });
    
    // Try to load textures, fall back to colors if they fail
    try {
      const earthTexture = loader.load('/textures/earthmap.jpg', undefined, undefined, () => {
        console.log('Earth texture not found, using fallback color');
      });
      // Ensure smooth texture filtering to eliminate any aliasing stripes
      earthTexture.minFilter = THREE.LinearFilter;
      earthTexture.magFilter = THREE.LinearFilter;
      earthTexture.generateMipmaps = false;
      earthMaterial.map = earthTexture;
      // Removed all lighting-related maps to ensure smooth appearance
    } catch {
      console.log('Using fallback Earth appearance');
    }
    
    this.earthMesh = new THREE.Mesh(geometry, earthMaterial);
    
    // Debug: Log Earth mesh details
    console.log('Earth mesh created:', {
      geometry: geometry.type,
      segments: { width: 128, height: 128 },
      material: earthMaterial.type,
      vertices: geometry.attributes.position.count
    });
    
    this.earthGroup.add(this.earthMesh);
    
    // City lights layer - restored with enhanced visibility
      // --- City lights layer ---
      // Use a larger offset radius for the lights mesh to avoid z-fighting with the surface
      const lightsGeometry = new THREE.SphereGeometry(1.01, widthSegments, heightSegments);
      const lightsMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff88,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false, // do not write to depth so additive blend appears correctly
        side: THREE.FrontSide,
      });

      try {
        const lightsTexture = loader.load('/textures/earthlights.jpg', undefined, undefined, () => {
          console.log('Earth lights texture not found, using fallback');
        });
    lightsTexture.minFilter = THREE.LinearFilter;
    lightsTexture.magFilter = THREE.LinearFilter;
    lightsTexture.generateMipmaps = false;
    lightsTexture.wrapS = THREE.ClampToEdgeWrapping;
    lightsTexture.wrapT = THREE.ClampToEdgeWrapping;
    lightsMaterial.map = lightsTexture;
      } catch {
        console.log('Using fallback lights appearance');
      }

    this.lightsMesh = new THREE.Mesh(lightsGeometry, lightsMaterial);
    // Ensure lights render after the main surface
    this.lightsMesh.renderOrder = 1;
    this.earthGroup.add(this.lightsMesh);
    
    // --- Cloud layer ---
    // Clouds should sit above both surface and lights to avoid banding; use alphaMap for soft edges
    const cloudsGeometry = new THREE.SphereGeometry(1.02, widthSegments, heightSegments);
    const cloudsMaterialFinal = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5, // semi-transparent clouds
      depthWrite: false, // allow proper blending with underlying layers
      side: THREE.DoubleSide,
      alphaTest: 0.12, // discard very low alpha to avoid banding from semi-transparent fragments
    });

    try {
      const cloudsTexture = loader.load('/textures/earthclouds.jpg', undefined, undefined, () => {
        console.log('Earth clouds texture not found, using fallback');
      });
  cloudsTexture.minFilter = THREE.LinearFilter;
  cloudsTexture.magFilter = THREE.LinearFilter;
  cloudsTexture.generateMipmaps = false;
  cloudsTexture.wrapS = THREE.ClampToEdgeWrapping;
  cloudsTexture.wrapT = THREE.ClampToEdgeWrapping;
  // Use the texture both as the color map and as an alpha map (luminance controls transparency)
  cloudsMaterialFinal.map = cloudsTexture;
  cloudsMaterialFinal.alphaMap = cloudsTexture;
    } catch {
      console.log('Using fallback clouds appearance');
    }

    this.cloudsMesh = new THREE.Mesh(cloudsGeometry, cloudsMaterialFinal);
    this.cloudsMesh.renderOrder = 2; // render clouds last
    this.earthGroup.add(this.cloudsMesh);
    
    // No atmospheric glow - removed to eliminate blue border
    // Creating empty mesh to maintain interface compatibility
    this.glowMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }));
  }
  
  private createStarfield(scene: THREE.Scene) {
    this.stars = getStarfield({ numStars: 2000 });
    scene.add(this.stars);
  }
  
  public animate() {
    // Smooth rotation speeds for each layer
    this.earthMesh.rotation.y += 0.0005; // Earth surface rotation
    this.lightsMesh.rotation.y += 0.0005; // City lights rotation (same as Earth)
    this.cloudsMesh.rotation.y += 0.0007; // Clouds rotate slightly faster for realism
    // No glow mesh rotation - atmospheric glow removed
    this.stars.rotation.y -= 0.0001; // Starfield counter-rotation
  }
  
  public setPosition(x: number, y: number, z: number) {
    this.earthGroup.position.set(x, y, z);
  }
  
  public setScale(scale: number) {
    this.earthGroup.scale.setScalar(scale);
  }
}