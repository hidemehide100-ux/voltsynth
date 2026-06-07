import React, { useState } from 'react';

interface PadProps {
  label: string;
  onTrigger: () => void;
  color?: 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'cyan' | 'orange';
}

export function Pad({ label, onTrigger, color = 'red' }: PadProps) {
  const [isActive, setIsActive] = useState(false);

  const handlePress = (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
    if (e.type === 'touchstart') e.preventDefault(); // prevent mouse emulation
    setIsActive(true);
    onTrigger();
  };

  const handleRelease = () => {
    setIsActive(false);
  };

  const glowColors = {
    red: 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] border-red-400 text-white',
    blue: 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] border-blue-400 text-white',
    green: 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] border-emerald-400 text-white',
    yellow: 'bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.8)] border-yellow-300 text-black',
    purple: 'bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.8)] border-purple-400 text-white',
    cyan: 'bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)] border-cyan-300 text-black',
    orange: 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.8)] border-orange-400 text-white',
  };

  const inactiveColor = 'bg-[#1e1e1e] border-neutral-800 shadow-[inset_0_2px_10px_rgba(0,0,0,1),0_2px_5px_rgba(0,0,0,0.5)] text-neutral-500';

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onPointerDown={handlePress}
        onPointerUp={handleRelease}
        onPointerLeave={handleRelease}
        onTouchStart={handlePress}
        onTouchEnd={handleRelease}
        onTouchCancel={handleRelease}
        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-md border-2 transition-all duration-75 select-none touch-none flex items-center justify-center
          ${isActive ? glowColors[color] : inactiveColor}
        `}
      >
      </button>
      <span className="text-[10px] font-bold text-neutral-500 tracking-wider uppercase select-none">{label}</span>
    </div>
  );
}
