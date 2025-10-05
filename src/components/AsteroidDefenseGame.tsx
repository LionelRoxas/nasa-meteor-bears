'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { MouseEvent } from 'react';

interface AsteroidData {
  id: string;
  name: string;
  estimated_diameter: {
    kilometers: {
      estimated_diameter_min: number;
      estimated_diameter_max: number;
    };
  };
  is_potentially_hazardous_asteroid: boolean;
  close_approach_data: Array<{
    relative_velocity: {
      kilometers_per_second: string;
      kilometers_per_hour: string;
      miles_per_hour: string;
    };
    miss_distance: {
      kilometers: string;
      miles: string;
    };
    close_approach_date: string;
  }>;
  absolute_magnitude_h: number;
}

interface GameAsteroid {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isHazardous: boolean;
  data: AsteroidData;
  destroyed: boolean;
}

interface AsteroidInfoPanelProps {
  asteroid: AsteroidData | null;
}

const AsteroidInfoPanel = ({ asteroid }: AsteroidInfoPanelProps) => {
  if (!asteroid) {
    return (
      <div className="w-80 bg-gray-900 text-white p-4 border-l border-gray-700">
        <h2 className="text-xl font-bold mb-4">Asteroid Information</h2>
        <p className="text-gray-400">Click on an asteroid to view its details</p>
      </div>
    );
  }

  const approach = asteroid.close_approach_data[0];
  const diameter = asteroid.estimated_diameter.kilometers;

  return (
    <div className="w-80 bg-gray-900 text-white p-4 border-l border-gray-700 overflow-y-auto">
      <h2 className="text-xl font-bold mb-4">Asteroid Information</h2>
      
      <div className="space-y-3">
        <div>
          <h3 className="font-semibold text-blue-400">Name</h3>
          <p className="text-sm">{asteroid.name}</p>
        </div>

        <div>
          <h3 className="font-semibold text-blue-400">Hazard Status</h3>
          <p className={`text-sm font-medium ${
            asteroid.is_potentially_hazardous_asteroid 
              ? 'text-red-400' 
              : 'text-green-400'
          }`}>
            {asteroid.is_potentially_hazardous_asteroid ? 'HAZARDOUS' : 'NON-HAZARDOUS'}
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-blue-400">Diameter</h3>
          <p className="text-sm">
            {diameter.estimated_diameter_min.toFixed(3)} - {diameter.estimated_diameter_max.toFixed(3)} km
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-blue-400">Velocity</h3>
          <p className="text-sm">
            {parseFloat(approach.relative_velocity.kilometers_per_second).toFixed(2)} km/s
          </p>
          <p className="text-xs text-gray-400">
            ({parseFloat(approach.relative_velocity.miles_per_hour).toLocaleString()} mph)
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-blue-400">Miss Distance</h3>
          <p className="text-sm">
            {parseFloat(approach.miss_distance.kilometers).toLocaleString()} km
          </p>
          <p className="text-xs text-gray-400">
            ({parseFloat(approach.miss_distance.miles).toLocaleString()} miles)
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-blue-400">Approach Date</h3>
          <p className="text-sm">{approach.close_approach_date}</p>
        </div>

        <div>
          <h3 className="font-semibold text-blue-400">Magnitude</h3>
          <p className="text-sm">{asteroid.absolute_magnitude_h}</p>
        </div>

        <div>
          <h3 className="font-semibold text-blue-400">ID</h3>
          <p className="text-xs text-gray-400">{asteroid.id}</p>
        </div>
      </div>
    </div>
  );
};

export const AsteroidDefenseGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [asteroids, setAsteroids] = useState<GameAsteroid[]>([]);
  const [selectedAsteroid, setSelectedAsteroid] = useState<AsteroidData | null>(null);
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [asteroidsDestroyed, setAsteroidsDestroyed] = useState(0);
  const [earthHealth, setEarthHealth] = useState(100);
  const [asteroidData, setAsteroidData] = useState<AsteroidData[]>([]);

  // Load asteroid data
  useEffect(() => {
    const loadAsteroidData = async () => {
      try {
        const [hazardousResponse, todayResponse] = await Promise.all([
          fetch('/data/hazardous-asteroids.json'),
          fetch('/data/today-asteroids.json')
        ]);

        const hazardousData = await hazardousResponse.json();
        const todayData = await todayResponse.json();

        // Combine and process asteroid data
        const allAsteroids: AsteroidData[] = [...hazardousData];
        
        // Add non-hazardous asteroids from today's data
        Object.values(todayData.near_earth_objects || {}).forEach((dayAsteroids: unknown) => {
          if (Array.isArray(dayAsteroids)) {
            dayAsteroids.forEach((asteroid: AsteroidData) => {
              if (!asteroid.is_potentially_hazardous_asteroid) {
                allAsteroids.push(asteroid);
              }
            });
          }
        });

        setAsteroidData(allAsteroids.slice(0, 100)); // Limit for performance
      } catch (error) {
        console.error('Failed to load asteroid data:', error);
      }
    };

    loadAsteroidData();
  }, []);

  const createAsteroid = useCallback((data: AsteroidData): GameAsteroid | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
    let x, y, vx, vy;

    // Spawn from edges
    switch (side) {
      case 0: // top
        x = Math.random() * canvas.width;
        y = -50;
        vx = (Math.random() - 0.5) * 2;
        vy = Math.random() * 2 + 1;
        break;
      case 1: // right
        x = canvas.width + 50;
        y = Math.random() * canvas.height;
        vx = -(Math.random() * 2 + 1);
        vy = (Math.random() - 0.5) * 2;
        break;
      case 2: // bottom
        x = Math.random() * canvas.width;
        y = canvas.height + 50;
        vx = (Math.random() - 0.5) * 2;
        vy = -(Math.random() * 2 + 1);
        break;
      default: // left
        x = -50;
        y = Math.random() * canvas.height;
        vx = Math.random() * 2 + 1;
        vy = (Math.random() - 0.5) * 2;
        break;
    }

    const diameter = data.estimated_diameter.kilometers.estimated_diameter_max;
    const radius = Math.max(10, Math.min(30, diameter * 50)); // Scale radius based on size

    return {
      id: data.id,
      x,
      y,
      vx,
      vy,
      radius,
      isHazardous: data.is_potentially_hazardous_asteroid,
      data,
      destroyed: false
    };
  }, []);

  const spawnWave = useCallback(() => {
    if (asteroidData.length === 0) return;

    const waveSize = Math.min(5 + wave, 15);
    const newAsteroids: GameAsteroid[] = [];

    for (let i = 0; i < waveSize; i++) {
      const randomData = asteroidData[Math.floor(Math.random() * asteroidData.length)];
      const asteroid = createAsteroid(randomData);
      if (asteroid) {
        newAsteroids.push(asteroid);
      }
    }

    setAsteroids(prev => [...prev, ...newAsteroids]);
  }, [asteroidData, createAsteroid, wave]);

  const handleCanvasClick = useCallback((event: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setAsteroids(prev => {
      const newAsteroids = [...prev];
      for (let i = newAsteroids.length - 1; i >= 0; i--) {
        const asteroid = newAsteroids[i];
        if (asteroid.destroyed) continue;

        const dx = x - asteroid.x;
        const dy = y - asteroid.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= asteroid.radius) {
          // Asteroid hit!
          asteroid.destroyed = true;
          setSelectedAsteroid(asteroid.data);
          setScore(prev => prev + (asteroid.isHazardous ? 100 : 50));
          setAsteroidsDestroyed(prev => prev + 1);
          break;
        }
      }
      return newAsteroids;
    });
  }, []);

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.fillStyle = '#000011';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw stars
    ctx.fillStyle = 'white';
    for (let i = 0; i < 100; i++) {
      const x = (i * 123) % canvas.width;
      const y = (i * 456) % canvas.height;
      ctx.fillRect(x, y, 1, 1);
    }

    // Draw Earth
    const earthX = canvas.width / 2;
    const earthY = canvas.height / 2;
    const earthRadius = 80;

    // Earth glow
    const earthGradient = ctx.createRadialGradient(earthX, earthY, earthRadius * 0.8, earthX, earthY, earthRadius * 1.5);
    earthGradient.addColorStop(0, 'rgba(100, 149, 237, 0.3)');
    earthGradient.addColorStop(1, 'rgba(100, 149, 237, 0)');
    ctx.fillStyle = earthGradient;
    ctx.beginPath();
    ctx.arc(earthX, earthY, earthRadius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Earth body
    ctx.fillStyle = '#4169E1';
    ctx.beginPath();
    ctx.arc(earthX, earthY, earthRadius, 0, Math.PI * 2);
    ctx.fill();

    // Earth continents (simple)
    ctx.fillStyle = '#228B22';
    ctx.beginPath();
    ctx.arc(earthX - 20, earthY - 10, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(earthX + 15, earthY + 20, 20, 0, Math.PI * 2);
    ctx.fill();

    // Update and draw asteroids
    setAsteroids(prev => {
      const activeAsteroids = prev.filter(asteroid => {
        if (asteroid.destroyed) {
          // Draw explosion effect
          ctx.fillStyle = 'orange';
          for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2;
            const dist = Math.random() * 20;
            ctx.beginPath();
            ctx.arc(
              asteroid.x + Math.cos(angle) * dist,
              asteroid.y + Math.sin(angle) * dist,
              2,
              0,
              Math.PI * 2
            );
            ctx.fill();
          }
          return false;
        }

        // Update position with slight gravity towards Earth
        const earthX = canvas.width / 2;
        const earthY = canvas.height / 2;
        const gravityDx = earthX - asteroid.x;
        const gravityDy = earthY - asteroid.y;
        const gravityDistance = Math.sqrt(gravityDx * gravityDx + gravityDy * gravityDy);
        
        // Apply slight gravitational pull
        const gravity = 0.001;
        asteroid.vx += (gravityDx / gravityDistance) * gravity;
        asteroid.vy += (gravityDy / gravityDistance) * gravity;
        
        asteroid.x += asteroid.vx;
        asteroid.y += asteroid.vy;

        // Check if asteroid hits Earth
        const dx = asteroid.x - earthX;
        const dy = asteroid.y - earthY;
        const distanceToEarth = Math.sqrt(dx * dx + dy * dy);

        if (distanceToEarth <= earthRadius + asteroid.radius) {
          // Asteroid hits Earth - reduce health
          const damage = asteroid.isHazardous ? 20 : 10;
          setEarthHealth(prev => {
            const newHealth = Math.max(0, prev - damage);
            if (newHealth === 0) {
              setGameOver(true);
            }
            return newHealth;
          });
          return false;
        }

        // Remove asteroids that are too far off screen
        if (asteroid.x < -100 || asteroid.x > canvas.width + 100 ||
            asteroid.y < -100 || asteroid.y > canvas.height + 100) {
          return false;
        }

        // Draw asteroid
        if (asteroid.isHazardous) {
          // Red circle for hazardous asteroids
          ctx.strokeStyle = '#FF0000';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(asteroid.x, asteroid.y, asteroid.radius + 5, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Asteroid body
        ctx.fillStyle = asteroid.isHazardous ? '#8B0000' : '#696969';
        ctx.beginPath();
        ctx.arc(asteroid.x, asteroid.y, asteroid.radius, 0, Math.PI * 2);
        ctx.fill();

        // Asteroid texture
        ctx.fillStyle = asteroid.isHazardous ? '#A52A2A' : '#808080';
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2;
          const dist = asteroid.radius * 0.3;
          ctx.beginPath();
          ctx.arc(
            asteroid.x + Math.cos(angle) * dist,
            asteroid.y + Math.sin(angle) * dist,
            2,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }

        return true;
      });

      return activeAsteroids;
    });

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, []);

  const startGame = () => {
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    setWave(1);
    setAsteroidsDestroyed(0);
    setEarthHealth(100);
    setAsteroids([]);
    spawnWave();
  };

  // Game loop
  useEffect(() => {
    if (gameStarted && !gameOver) {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameStarted, gameOver, gameLoop]);

  // Spawn new waves
  useEffect(() => {
    if (gameStarted && !gameOver && asteroids.length === 0 && asteroidsDestroyed > 0) {
      const timer = setTimeout(() => {
        setWave(prev => prev + 1);
        spawnWave();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [gameStarted, gameOver, asteroids.length, asteroidsDestroyed, spawnWave]);

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      <div className="flex-1 relative flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={1200}
          height={800}
          className="border border-gray-700 cursor-crosshair max-w-full max-h-full"
          onClick={handleCanvasClick}
        />
        
        {/* Game UI */}
        <div className="absolute top-4 left-4 text-white z-10">
          <div className="bg-black bg-opacity-70 p-4 rounded">
            <h1 className="text-2xl font-bold mb-2">Asteroid Defense</h1>
            <p>Score: {score}</p>
            <p>Wave: {wave}</p>
            <p>Destroyed: {asteroidsDestroyed}</p>
            <div className="mt-2">
              <p className="text-sm">Earth Health:</p>
              <div className="w-32 bg-gray-700 rounded-full h-2 mt-1">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    earthHealth > 60 ? 'bg-green-500' : 
                    earthHealth > 30 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${earthHealth}%` }}
                ></div>
              </div>
              <p className="text-xs mt-1">{earthHealth}/100</p>
            </div>
            <p className="text-sm mt-2 text-gray-300">Click asteroids to destroy them!</p>
          </div>
        </div>

        {!gameStarted && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 z-20">
            <div className="text-center text-white">
              <h1 className="text-4xl font-bold mb-4">Asteroid Defense</h1>
              <p className="text-lg mb-6">Protect Earth by clicking on incoming asteroids!</p>
              <p className="text-sm mb-2">🔴 Red circles = Hazardous asteroids (100 points, 20 damage)</p>
              <p className="text-sm mb-6">⚪ Gray asteroids = Non-hazardous (50 points, 10 damage)</p>
              <button
                onClick={startGame}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded text-lg"
              >
                Start Game
              </button>
            </div>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90 z-20">
            <div className="text-center text-white">
              <h1 className="text-4xl font-bold mb-4 text-red-500">GAME OVER</h1>
              <p className="text-xl mb-2">Earth has been destroyed!</p>
              <p className="text-lg mb-2">Final Score: {score}</p>
              <p className="text-lg mb-2">Waves Survived: {wave}</p>
              <p className="text-lg mb-6">Asteroids Destroyed: {asteroidsDestroyed}</p>
              <button
                onClick={startGame}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded text-lg"
              >
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>

      <AsteroidInfoPanel asteroid={selectedAsteroid} />
    </div>
  );
};