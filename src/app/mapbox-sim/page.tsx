'use client';

import MapboxMap from '@/components/MapboxMap';

export default function MapboxSimPage() {
  return (
    <div className="h-screen bg-black overflow-hidden">
      {/* Full Screen Map Container */}
      <MapboxMap className="w-full h-full" />
    </div>
  );
}
