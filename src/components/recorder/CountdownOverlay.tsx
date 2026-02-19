"use client";

import { useEffect, useState } from "react";

interface CountdownOverlayProps {
  onComplete: () => void;
  onCancel?: () => void;
}

export function CountdownOverlay({ onComplete, onCancel }: CountdownOverlayProps) {
  const [currentNumber, setCurrentNumber] = useState<3 | 2 | 1 | null>(3);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (currentNumber === null) {
      // Countdown complete
      setTimeout(() => {
        onComplete();
      }, 200); // Small delay after fade out
      return;
    }

    // Fade in
    setIsVisible(true);

    // After fade in + visible time, fade out
    const fadeOutTimer = setTimeout(() => {
      setIsVisible(false);

      // After fade out, move to next number
      setTimeout(() => {
        if (currentNumber === 3) {
          setCurrentNumber(2);
        } else if (currentNumber === 2) {
          setCurrentNumber(1);
        } else if (currentNumber === 1) {
          setCurrentNumber(null);
        }
      }, 200); // Wait for fade out animation
    }, 800); // 0.2s fade in + 0.6s visible

    return () => {
      clearTimeout(fadeOutTimer);
    };
  }, [currentNumber, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" style={{ zIndex: 100 }}>
      {currentNumber !== null && (
        <div
          className={`text-9xl font-bold text-white transition-all duration-200 ${isVisible
              ? "opacity-100 scale-100"
              : "opacity-0 scale-75"
            }`}
          style={{
            textShadow: "0 0 40px rgba(255, 255, 255, 0.5), 0 0 80px rgba(255, 255, 255, 0.3)",
          }}
        >
          {currentNumber}
        </div>
      )}
      {onCancel && (
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 rounded-lg bg-white/10 px-4 py-2 text-white hover:bg-white/20 transition-colors"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
