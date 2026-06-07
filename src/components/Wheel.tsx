import React, { useRef, useState, useEffect } from 'react';

interface WheelProps {
  label: string;
  isPitch?: boolean;
  value: number; // 0 to 1 for mod, -1 to 1 for pitch
  onChange: (val: number) => void;
}

export function Wheel({ label, isPitch, value, onChange }: WheelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // High precision drag handling
  const startYRef = useRef(0);
  const startValRef = useRef(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValRef.current = value;
    
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerMove = (e: PointerEvent) => {
    // clientY gets smaller as you go UP, so start - current = positive when dragging up
    const deltaY = startYRef.current - e.clientY; 
    const sensitivity = 80; // 80px travel for full range
    
    let normalized = startValRef.current;
    if (isPitch) {
      normalized += (deltaY / sensitivity) * 2;
    } else {
      normalized += (deltaY / sensitivity);
    }
    
    normalized = Math.max(isPitch ? -1 : 0, Math.min(1, normalized));
    onChange(normalized);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    
    // DELIBERATELY REMOVED THE SNAP-BACK BEHAVIOR TO ALLOW PITCH HOLD:
    // User requested pitch slider not to bounce down when released.
  };

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  // Calculate wheel visual offset
  const maxTravel = 35; // px displacement up or down
  const yOffset = isPitch ? -value * maxTravel : -(value - 0.5) * maxTravel * 2;

  return (
    <div className="flex flex-col items-center gap-3">
      <div 
        ref={containerRef}
        className="w-10 h-32 bg-neutral-900 rounded-sm border border-neutral-950 shadow-[inset_0_5px_15px_rgba(0,0,0,1)] relative overflow-hidden flex justify-center items-center cursor-ns-resize touch-none"
        onPointerDown={handlePointerDown}
      >
        {/* The glowing groove line in background */}
        <div className="absolute w-[2px] h-full bg-black shadow-[0_0_5px_rgba(255,0,0,0.2)]" />
        <div className={`absolute w-[1px] h-full ${isPitch ? 'bg-red-900/40' : 'bg-emerald-900/50'}`} />

        {/* The Wheel physical part */}
        <div 
          className="w-8 h-16 rounded-sm absolute transition-transform duration-75"
          style={{ 
            background: 'linear-gradient(to bottom, #111 0%, #333 50%, #111 100%)',
            boxShadow: '0 4px 10px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.1)',
            transform: `translateY(${yOffset}px)`
          }}
        >
          {/* Grip lines */}
          <div className="absolute inset-0 flex flex-col justify-evenly px-1 opacity-40 pointer-events-none">
            <div className="h-[2px] w-full bg-black shadow-[0_1px_1px_rgba(255,255,255,0.1)]"></div>
            <div className="h-[2px] w-full bg-black shadow-[0_1px_1px_rgba(255,255,255,0.1)]"></div>
            <div className="h-[2px] w-full bg-black shadow-[0_1px_1px_rgba(255,255,255,0.1)]"></div>
            <div className="h-[2px] w-full bg-black shadow-[0_1px_1px_rgba(255,255,255,0.1)]"></div>
            <div className="h-[2px] w-full bg-black shadow-[0_1px_1px_rgba(255,255,255,0.1)]"></div>
          </div>
        </div>
      </div>
      <span className="text-[10px] font-bold text-neutral-500 tracking-wider uppercase">{label}</span>
    </div>
  );
}
