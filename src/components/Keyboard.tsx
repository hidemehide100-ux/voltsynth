import React, { useState, useEffect } from 'react';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

interface KeyboardProps {
  startOctave?: number;
  numKeys?: number;
  onNoteOn: (midiNote: number) => void;
  onNoteOff: (midiNote: number) => void;
}

export function Keyboard({ startOctave = 3, numKeys = 25, onNoteOn, onNoteOff }: KeyboardProps) {
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());

  // Generate keys data
  const keys = Array.from({ length: numKeys }).map((_, i) => {
    const midiNote = (startOctave + 1) * 12 + i; // C3 is MIDI 48. If startOctave=3, 4*12=48.
    const noteName = NOTES[midiNote % 12];
    const isBlack = noteName.includes('#');
    return { midiNote, noteName, isBlack };
  });

  const handleNoteOn = (midiNote: number) => {
    setActiveNotes(prev => new Set(prev).add(midiNote));
    onNoteOn(midiNote);
  };

  const handleNoteOff = (midiNote: number) => {
    setActiveNotes(prev => {
      const next = new Set(prev);
      next.delete(midiNote);
      return next;
    });
    onNoteOff(midiNote);
  };

  // Keyboard mapping for computer keys -> MIDI notes (relative to start octave)
  const keyMap: Record<string, number> = {
    'a': 0, 'w': 1, 's': 2, 'e': 3, 'd': 4, 'f': 5, 't': 6, 'g': 7, 'y': 8, 'h': 9, 'u': 10, 'j': 11, 'k': 12, 'o': 13, 'l': 14, 'p': 15, ';': 16, '\'': 17
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return; // Ignore hold repetition
      const offset = keyMap[e.key.toLowerCase()];
      if (offset !== undefined) {
        const midi = (startOctave + 1) * 12 + offset;
        if (midi < (startOctave + 1) * 12 + numKeys) {
          handleNoteOn(midi);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const offset = keyMap[e.key.toLowerCase()];
      if (offset !== undefined) {
        const midi = (startOctave + 1) * 12 + offset;
        if (midi < (startOctave + 1) * 12 + numKeys) {
          handleNoteOff(midi);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [startOctave, numKeys, onNoteOn, onNoteOff]);

  return (
    <div className="flex relative h-32 sm:h-48 w-full overflow-hidden rounded-b-xl border-t-4 border-neutral-900 bg-[#000000] select-none touch-none shadow-2xl">
      {/* Container for keys to position black keys reliably */}
      <div className="flex h-full w-full relative bg-[#000] p-0.5 gap-[1px]">
        {keys.map((key, i) => {
          if (key.isBlack) return null; // Render whites first in normal flow

          const isPressed = activeNotes.has(key.midiNote);
          const glowColor = `hsl(${(i * 360) / numKeys}, 100%, 55%)`;
          
          return (
            <div
              key={key.midiNote}
              className={`flex-1 relative transition-all duration-75 rounded-b-md
                ${isPressed ? 'origin-top scale-[0.98]' : 'origin-top'}
              `}
              style={{
                 background: isPressed 
                     ? glowColor 
                     : 'linear-gradient(to right, #050505 0%, #1c1c1c 20%, #2a2a2a 50%, #1c1c1c 80%, #050505 100%)',
                 boxShadow: isPressed 
                    ? `inset 0 0 40px rgba(255,255,255,0.4), inset 0 -4px 10px rgba(0,0,0,0.5), 0 0 20px ${glowColor}` 
                    : 'inset 0 1px 2px rgba(255,255,255,0.05), inset 0 -4px 8px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.5)'
              }}
              onPointerDown={(e) => {
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                handleNoteOn(key.midiNote);
              }}
              onPointerUp={(e) => {
                (e.target as HTMLElement).releasePointerCapture(e.pointerId);
                handleNoteOff(key.midiNote);
              }}
              onPointerCancel={(e) => handleNoteOff(key.midiNote)}
              onPointerEnter={(e) => {
                if (e.buttons > 0) handleNoteOn(key.midiNote); // glissando
              }}
              onPointerLeave={() => {
                if (activeNotes.has(key.midiNote)) handleNoteOff(key.midiNote);
              }}
            >
               {/* Vertical highlight for metallic matte look */}
               <div className={`absolute inset-y-0 left-1/2 -translate-x-1/2 w-[80%] bg-gradient-to-b from-white/10 to-transparent pointer-events-none rounded-b-md ${isPressed ? 'opacity-20' : 'opacity-100'}`}></div>
               {/* Extra shine at the very top edge */}
               <div className={`absolute top-0 inset-x-1 h-1 bg-gradient-to-b from-white/20 to-transparent pointer-events-none ${isPressed ? 'hidden' : ''}`}></div>
            </div>
          );
        })}
        
        {/* Render Black Keys Absolutely positioned over whites */}
        {keys.map((key, i) => {
          if (!key.isBlack) return null;

          // Calculate left position based on how many white keys came before it
          const whiteKeysBefore = keys.slice(0, i).filter(k => !k.isBlack).length;
          const totalWhiteKeys = keys.filter(k => !k.isBlack).length;
          
          const leftPercent = (whiteKeysBefore / totalWhiteKeys) * 100;
          const isPressed = activeNotes.has(key.midiNote);
          const glowColor = `hsl(${(i * 360) / numKeys}, 100%, 55%)`;

          return (
            <div
              key={key.midiNote}
              className="absolute top-0 z-10 w-[3.5%] -ml-[1.75%] shadow-2xl"
              style={{ left: `${leftPercent}%`, height: '60%' }}
            >
              <div
                className={`w-full h-full rounded-b transition-all duration-75 mx-auto
                  ${isPressed ? 'origin-top scale-[0.98]' : 'origin-top'}
                `}
                style={{
                  background: isPressed 
                     ? glowColor 
                     : 'linear-gradient(to right, #000000 0%, #1a1a1a 15%, #2a2a2a 50%, #1a1a1a 85%, #000000 100%)',
                  boxShadow: isPressed 
                     ? `inset 0 0 30px rgba(255,255,255,0.4), inset 0 -2px 10px rgba(0,0,0,0.5), 0 0 20px ${glowColor}` 
                     : '0 10px 15px rgba(0,0,0,1), inset 0 -4px 5px rgba(0,0,0,1), inset 0 1px 1px rgba(255,255,255,0.1)'
                }}
                onPointerDown={(e) => {
                  (e.target as HTMLElement).setPointerCapture(e.pointerId);
                  handleNoteOn(key.midiNote);
                }}
                onPointerUp={(e) => {
                  (e.target as HTMLElement).releasePointerCapture(e.pointerId);
                  handleNoteOff(key.midiNote);
                }}
                onPointerCancel={() => handleNoteOff(key.midiNote)}
                onPointerEnter={(e) => {
                  if (e.buttons > 0) handleNoteOn(key.midiNote); // glissando
                }}
                onPointerLeave={() => {
                  if (activeNotes.has(key.midiNote)) handleNoteOff(key.midiNote);
                }}
              >
                  {/* Highlight on top of black key */}
                  <div className={`w-[80%] mx-auto h-[95%] bg-gradient-to-b from-white/10 to-transparent rounded-b-sm ${isPressed ? 'opacity-20' : 'opacity-100'} pointer-events-none`} />
                  <div className={`absolute top-0 inset-x-1 h-1 bg-gradient-to-b from-white/20 to-transparent pointer-events-none ${isPressed ? 'hidden' : ''}`}></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
