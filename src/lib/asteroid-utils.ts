/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/asteroid-utils.ts

interface AsteroidCreationOptions {
  diameter: number;
  subdivisions?: number;
  smoothingIterations?: number;
}

/**
 * Creates an organic, potato-shaped asteroid geometry with smoothing
 * @param THREE - The Three.js library (can be from CDN or npm package)
 */
export function createAsteroidGeometry(
  THREE: any,
  options: AsteroidCreationOptions
): any {
  const { diameter, subdivisions = 5, smoothingIterations = 3 } = options;

  const size = diameter / 1000;
  const geometry = new THREE.IcosahedronGeometry(size, subdivisions);

  const positionAttribute = geometry.getAttribute("position");
  const vertex = new THREE.Vector3();
  const smoothedPositions: number[] = [];

  // First pass: create irregular organic shape
  for (let i = 0; i < positionAttribute.count; i++) {
    vertex.fromBufferAttribute(positionAttribute, i);

    const length = vertex.length();
    vertex.normalize();

    // Create organic variations for potato shape using layered noise
    const noise1 =
      Math.sin(vertex.x * 2.1 + vertex.y * 1.7) *
      Math.cos(vertex.z * 2.3) *
      0.25;
    const noise2 =
      Math.sin(vertex.y * 3.2 + vertex.z * 2.8) *
      Math.cos(vertex.x * 3.1) *
      0.18;
    const noise3 =
      Math.sin(vertex.z * 1.9 + vertex.x * 2.2) *
      Math.cos(vertex.y * 1.8) *
      0.15;


    // Combine noises for irregular shape
    const displacement = 1 + noise1 + noise2 + noise3;

    vertex.multiplyScalar(length * displacement);
    smoothedPositions.push(vertex.x, vertex.y, vertex.z);
  }

  // Second pass: apply Laplacian smoothing
  for (let iter = 0; iter < smoothingIterations; iter++) {
    const tempPositions = [...smoothedPositions];

    for (let i = 0; i < positionAttribute.count; i++) {
      const neighbors: any[] = [];
      const currentVertex = new THREE.Vector3(
        smoothedPositions[i * 3],
        smoothedPositions[i * 3 + 1],
        smoothedPositions[i * 3 + 2]
      );

      // Find neighboring vertices
      for (let j = 0; j < positionAttribute.count; j++) {
        if (i === j) continue;

        const otherVertex = new THREE.Vector3(
          smoothedPositions[j * 3],
          smoothedPositions[j * 3 + 1],
          smoothedPositions[j * 3 + 2]
        );

        const distance = currentVertex.distanceTo(otherVertex);
        // Neighbor threshold scales with size
        if (distance < 0.3 * size) {
          neighbors.push(otherVertex);
        }
      }

      // Average with neighbors for smoothing
      if (neighbors.length > 0) {
        const avg = new THREE.Vector3();
        neighbors.forEach((n: any) => avg.add(n));
        avg.divideScalar(neighbors.length);

        // Blend current position with average (0.5 = 50% smoothing)
        currentVertex.lerp(avg, 1);

        tempPositions[i * 3] = currentVertex.x;
        tempPositions[i * 3 + 1] = currentVertex.y;
        tempPositions[i * 3 + 2] = currentVertex.z;
      }
    }

    smoothedPositions.splice(0, smoothedPositions.length, ...tempPositions);
  }

  // Apply smoothed positions to geometry
  for (let i = 0; i < positionAttribute.count; i++) {
    positionAttribute.setXYZ(
      i,
      smoothedPositions[i * 3],
      smoothedPositions[i * 3 + 1],
      smoothedPositions[i * 3 + 2]
    );
  }

  positionAttribute.needsUpdate = true;
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Creates a complete asteroid mesh with realistic material
 * @param THREE - The Three.js library (can be from CDN or npm package)
 */
export function createAsteroidMesh(
  THREE: any,
  options: AsteroidCreationOptions
): any {
  const geometry = createAsteroidGeometry(THREE, options);

  // Realistic gray space rock material
  const material = new THREE.MeshStandardMaterial({
    color: 0xccccdd, // Light gray
    roughness: 0.5,
    metalness: 0.08,
    flatShading: false,
  });

  const asteroid = new THREE.Mesh(geometry, material);
  asteroid.castShadow = true;
  asteroid.receiveShadow = true;

  // Add random scaling for natural variation
  asteroid.scale.set(
    1 + Math.random() * 0.4,
    1 + Math.random() * 0.8,
    1 + Math.random() * 0.4
  );

  return asteroid;
}

/**
 * Creates smooth, realistic debris rocks for space environment
 * @param THREE - The Three.js library (can be from CDN or npm package)
 */
export function createDebrisRock(THREE: any, size: number): any {
  // Higher subdivision for smoother surface (4 instead of 1)
  const geometry = new THREE.IcosahedronGeometry(size, 4);

  const positionAttribute = geometry.getAttribute("position");
  const vertex = new THREE.Vector3();
  const smoothedPositions: number[] = [];

  // First pass: create organic irregular shape with layered noise
  for (let i = 0; i < positionAttribute.count; i++) {
    vertex.fromBufferAttribute(positionAttribute, i);

    const length = vertex.length();
    vertex.normalize();

    // Multi-layered noise for natural rock appearance
    const noise1 =
      Math.sin(vertex.x * 3.1 + vertex.y * 2.3) *
      Math.cos(vertex.z * 2.7) *
      0.1;
    const noise2 =
      Math.sin(vertex.y * 2.8 + vertex.z * 3.4) *
      Math.cos(vertex.x * 2.1) *
      0.075;
    const noise3 =
      Math.sin(vertex.z * 3.7 + vertex.x * 2.9) *
      Math.cos(vertex.y * 3.2) *
      0.06;

    // Add some random bumps for organic feel
    const randomness = 0;

    // Combine for irregular rock shape
    const displacement = 1 + noise1 + noise2 + noise3 + randomness;

    vertex.multiplyScalar(length * displacement);
    smoothedPositions.push(vertex.x, vertex.y, vertex.z);
  }

  // Second pass: Laplacian smoothing to eliminate sharp edges
  const smoothingIterations = 2;
  for (let iter = 0; iter < smoothingIterations; iter++) {
    const tempPositions = [...smoothedPositions];

    for (let i = 0; i < positionAttribute.count; i++) {
      const neighbors: any[] = [];
      const currentVertex = new THREE.Vector3(
        smoothedPositions[i * 3],
        smoothedPositions[i * 3 + 1],
        smoothedPositions[i * 3 + 2]
      );

      // Find neighboring vertices
      for (let j = 0; j < positionAttribute.count; j++) {
        if (i === j) continue;

        const otherVertex = new THREE.Vector3(
          smoothedPositions[j * 3],
          smoothedPositions[j * 3 + 1],
          smoothedPositions[j * 3 + 2]
        );

        const distance = currentVertex.distanceTo(otherVertex);
        if (distance < 0.35 * size) {
          neighbors.push(otherVertex);
        }
      }

      // Average with neighbors for smoothing
      if (neighbors.length > 0) {
        const avg = new THREE.Vector3();
        neighbors.forEach((n: any) => avg.add(n));
        avg.divideScalar(neighbors.length);

        // 80% smoothing
        currentVertex.lerp(avg, 0.8);

        tempPositions[i * 3] = currentVertex.x;
        tempPositions[i * 3 + 1] = currentVertex.y;
        tempPositions[i * 3 + 2] = currentVertex.z;
      }
    }

    smoothedPositions.splice(0, smoothedPositions.length, ...tempPositions);
  }

  // Apply smoothed positions to geometry
  for (let i = 0; i < positionAttribute.count; i++) {
    positionAttribute.setXYZ(
      i,
      smoothedPositions[i * 3],
      smoothedPositions[i * 3 + 1],
      smoothedPositions[i * 3 + 2]
    );
  }

  positionAttribute.needsUpdate = true;
  geometry.computeVertexNormals();

  // Random gray coloring with variation
  const grayValue = 0.5 + Math.random() * 0.3;
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(grayValue, grayValue, grayValue),
    roughness: 0,
    metalness: 0.00,
    flatShading: false, // Smooth shading
  });

  const rock = new THREE.Mesh(geometry, material);
  rock.castShadow = true;
  rock.receiveShadow = true;

  // Random scaling for natural variation
  rock.scale.set(
    1 + Math.random() * 0.6,
    1 + Math.random() * 0.8,
    1 + Math.random() * 0.6
  );

  return rock;
}
