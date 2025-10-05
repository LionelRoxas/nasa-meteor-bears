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
    
    // Main Earth surface - using MeshLambertMaterial for consistent flat shading
    const earthMaterial = new THREE.MeshLambertMaterial({
      // Fallback: Blue and green Earth-like appearance
      color: 0x4488bb,
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
    
    // City lights layer temporarily disabled to eliminate stripe artifacts
    const lightsMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0, // Completely transparent to test if this is causing stripes
    });
    
    this.lightsMesh = new THREE.Mesh(new THREE.BufferGeometry(), lightsMaterial);
    // Not adding to earthGroup to test if this is causing the stripes
    
    // Clouds layer removed - no more polygon layer
    this.cloudsMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }));
    
    // No atmospheric glow - removed to eliminate blue border
    // Creating empty mesh to maintain interface compatibility
    this.glowMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }));
  }
  
  private createStarfield(scene: THREE.Scene) {
    this.stars = getStarfield({ numStars: 2000 });
    scene.add(this.stars);
  }
  
  public animate() {
    // Much slower rotation speeds for each layer
    this.earthMesh.rotation.y += 0.0005; // Reduced from 0.002 to 0.0005
    this.lightsMesh.rotation.y += 0.0005; // Reduced from 0.002 to 0.0005
    // No clouds mesh rotation - clouds layer removed
    // No glow mesh rotation - atmospheric glow removed
    this.stars.rotation.y -= 0.0001; // Reduced from 0.0002 to 0.0001
  }
  
  public setPosition(x: number, y: number, z: number) {
    this.earthGroup.position.set(x, y, z);
  }
  
  public setScale(scale: number) {
    this.earthGroup.scale.setScalar(scale);
  }
}