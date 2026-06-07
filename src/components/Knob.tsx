import React, { useState, useEffect, useRef } from 'react';

interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
  formatValue?: (val: number) => string;
}

export function Knob({ label, value, min, max, onChange, formatValue }: KnobProps) {
  const [isDragging, setIsDragging] = useState(false);
  const knobRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startValRef = useRef(0);

  // Map value to angle (-135 to 135 deg)
  const angle = ((value - min) / (max - min)) * 270 - 135;

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault(); // Prevent text selection
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValRef.current = value;
    
    // Add event listeners to window for dragging outside the element
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerMove = (e: PointerEvent) => {
    const deltaY = startYRef.current - e.clientY;
    // Adjust sensitivity: e.g., 100 pixels = full range
    const sensitivity = 150; 
    const range = max - min;
    const deltaVal = (deltaY / sensitivity) * range;
    
    let newVal = startValRef.current + deltaVal;
    newVal = Math.max(min, Math.min(max, newVal));
    
    // Round to 2 decimal places to avoid crazy floats
    if (max - min > 100) newVal = Math.round(newVal);
    else newVal = Math.round(newVal * 100) / 100;
      
    onChange(newVal);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  };

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  const displayVal = formatValue ? formatValue(value) : value.toString();

  return (
    <div className="flex flex-col items-center justify-center gap-2 group w-16">
      <div 
        ref={knobRef}
        className="relative w-12 h-12 rounded-full cursor-ns-resize shadow-[inset_0_-2px_4px_rgba(0,0,0,0.6),0_4px_8px_rgba(0,0,0,0.8)] border border-neutral-800 flex items-center justify-center touch-none"
        style={{
          background: 'radial-gradient(circle at 30% 30%, #3a3a3a, #1a1a1a)'
        }}
        onPointerDown={handlePointerDown}
        title={displayVal}
      >
        {/* Indicator Line Container (Rotates) */}
        <div 
          className="absolute w-full h-full rounded-full transition-transform duration-75 ease-out"
          style={{ transform: `rotate(${angle}deg)` }}
        >
          {/* The Tick */}
          <div className="absolute top-[3px] left-1/2 -ml-[2px] w-[4px] h-[12px] bg-red-600 rounded-full shadow-[0_0_5px_rgba(255,0,0,0.8)]" />
        </div>
        
        {/* Outer Ring Ring Glow when dragging */}
        <div className={`absolute inset-0 rounded-full border border-red-500/0 transition-colors ${isDragging ? 'border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'group-hover:border-neutral-500/30'}`} />
      </div>
      
      <div className="flex flex-col items-center">
        <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase select-none">{label}</span>
      </div>
    </div>
  );
}
