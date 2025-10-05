'use client';

import { AsteroidDefenseGame3D } from '@/components/AsteroidDefenseGame3D';
import GameNavbar from "@/components/GameNavbar";

export default function GamePage() {
  return (
    <div className="h-screen bg-black">
      <GameNavbar />
      <AsteroidDefenseGame3D />
    </div>
  );
}