import React, { useRef, useEffect } from 'react';

interface FaderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
}

export function Fader({ label, value, min, max, onChange, formatValue }: FaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const calculateValue = (clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ry = clientY - rect.top;
    
    // ry = 0 is at top (max value)
    const normalized = Math.max(0, Math.min(1, 1 - (ry / rect.height)));
    
    // For faders, we usually want linear unless specified, but let's keep linear logic
    const newValue = min + normalized * (max - min);
    onChange(newValue);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    calculateValue(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging.current) {
      calculateValue(e.clientY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };
  
  const percentage = ((value - min) / (max - min)) * 100;
  const bottomPercent = percentage + '%';

  return (
    <div className="flex flex-col items-center gap-2 touch-none select-none">
      <div 
        ref={containerRef}
        className="relative w-8 h-32 bg-neutral-900 border border-neutral-700/50 rounded shadow-inner flex justify-center cursor-ns-resize"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Track Line */}
        <div className="w-[2px] h-full bg-neutral-950 shadow-[0_0_2px_rgba(0,0,0,0.8)]"></div>
        
        {/* Fill Line based on current value */}
        <div 
           className="absolute bottom-0 w-[2px] bg-red-500/50 shadow-[0_0_5px_rgba(239,68,68,0.5)] transition-all duration-75"
           style={{ height: bottomPercent }}
        ></div>
        
        {/* The Cap */}
        <div 
          className="absolute w-10 h-6 bg-neutral-800 rounded border border-neutral-600 shadow-[0_4px_6px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.2)] flex flex-col justify-center gap-[2px] items-center -ml-1 transition-transform duration-75"
          style={{ bottom: `calc(${bottomPercent} - 12px)` }}
        >
           <div className="w-8 h-[2px] bg-white/20"></div>
           <div className="w-8 h-[2px] bg-black/40"></div>
        </div>
      </div>
      
      <div className="flex flex-col items-center">
         <span className="text-[10px] font-bold text-neutral-400 tracking-wider font-sans">{label}</span>
      </div>
    </div>
  );
}
