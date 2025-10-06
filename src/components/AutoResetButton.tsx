// components/AutoResetButton.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";

interface AutoResetButtonProps {
  onReset: () => void;
  countdownSeconds: number;
}

export default function AutoResetButton({ onReset, countdownSeconds }: AutoResetButtonProps) {
  const [timeLeft, setTimeLeft] = useState(countdownSeconds);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Start countdown timer
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Timer reached zero, trigger reset
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setTimeout(() => {
            onReset();
          }, 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [onReset]);

  const handleManualReset = () => {
    // Clear timer and reset immediately
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    onReset();
  };

  return (
    <button
      onClick={handleManualReset}
      className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition-all"
    >
      {timeLeft > 0 ? `Reset in ${timeLeft}s` : "Resetting..."}
    </button>
  );
}