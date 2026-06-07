import React, { useState, useEffect, useRef } from 'react';
import { Knob } from './components/Knob';
import { Pad } from './components/Pad';
import { Wheel } from './components/Wheel';
import { Fader } from './components/Fader';
import { Keyboard } from './components/Keyboard';
import { VaultPanel } from './components/VaultPanel';
import { useSynth, SYNTH_PRESETS } from './lib/synth';
import { getRecordings, saveRecording, Recording } from './lib/history';
import { Square, Play, Circle, Zap, Volume2, Settings2, Sliders, Disc } from 'lucide-react';

export default function App() {
  const { 
    params, setParams, noteOn, noteOff, playDrum, 
    setPitch: engineSetPitch, setMod: engineSetMod, getVisualData,
    startRecording, stopRecording, getActiveCount
  } = useSynth();
  
  const [pitch, setPitch] = useState(0);
  const [mod, setMod] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPoweredOn, setIsPoweredOn] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [step, setStep] = useState(0);
  const [synthPage, setSynthPage] = useState(0);
  
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [activePlaybackId, setActivePlaybackId] = useState<string | null>(null);
  const activeUrlRef = useRef<string | null>(null);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);

  const [buddyState, setBuddyState] = useState('( ° ᴗ ° )');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [systemMessage, setSystemMessage] = useState('SYS_READY');
  const messageTimeoutRef = useRef<number | null>(null);
  const faceTimeoutRef = useRef<number | null>(null);
  const isFaceOverridden = useRef<boolean>(false);
  const lastParamTimeRef = useRef<number>(0);

  const fireMessage = (msg: string, faceOverride?: string, duration = 2000) => {
     setSystemMessage(msg);
     if (faceOverride) {
       setBuddyState(faceOverride);
       isFaceOverridden.current = true;
       if (faceTimeoutRef.current) clearTimeout(faceTimeoutRef.current);
       faceTimeoutRef.current = window.setTimeout(() => {
         isFaceOverridden.current = false;
       }, duration);
     }
     if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
     messageTimeoutRef.current = window.setTimeout(() => {
        setSystemMessage('SYS_READY');
     }, duration);
  };

  const handleParamChange = (key: keyof typeof params, value: any, displayValue: string) => {
    setParams({ [key]: value });
    const now = Date.now();
    if (now - lastParamTimeRef.current > 400) {
       fireMessage(`${String(key).toUpperCase()}: ${displayValue}`, '(O_O)', 800);
       lastParamTimeRef.current = now;
    } else {
       // Just update text without disrupting buddy face or resetting full timeout immediately
       setSystemMessage(`${String(key).toUpperCase()}: ${displayValue}`);
    }
  };

  const handleDrumTrigger = (type: any, label: string, isSeq = false, variant = 0) => {
    playDrum(type, variant);
    if (!isSeq) fireMessage(`TRIG: ${label}`, '\\(°o°)/', 1000);
  };

  const handleNoteOn = (note: number) => {
    noteOn(note);
    const notes = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    const name = notes[note % 12];
    const oct = Math.floor(note / 12) - 1;
    fireMessage(`NOTE: ${name}${oct}`, '♪(┌・。・)┌', 1000);
  };

  const handlePitch = (v: number) => {
    setPitch(v);
    engineSetPitch(v);
    if (Math.abs(v) > 0.1) fireMessage(`PITCH: ${(v * 100).toFixed(0)}%`, '(~‾▿‾)~', 1000);
  };

  const handleMod = (v: number) => {
    setMod(v);
    engineSetMod(v);
    if (v > 0.05) fireMessage(`MOD: ${(v * 100).toFixed(0)}%`, 'd(^_^)b', 1000);
  };

  // History Management
  const loadRecordings = async () => {
    try {
      const recs = await getRecordings();
      setRecordings(recs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadRecordings();
  }, []);

  const handlePlayRecording = (id: string, blob: Blob) => {
    if (playbackAudioRef.current) {
       playbackAudioRef.current.pause();
    }
    if (activeUrlRef.current) {
       URL.revokeObjectURL(activeUrlRef.current);
    }
    const url = URL.createObjectURL(blob);
    activeUrlRef.current = url;
    const audio = new Audio(url);
    playbackAudioRef.current = audio;
    audio.play();
    setActivePlaybackId(id);
    fireMessage("PLAYBACK", '(>‿<)', 2000);
    audio.onended = () => setActivePlaybackId(null);
  };

  const handleStopRecordingPlayback = () => {
    if (playbackAudioRef.current) {
       playbackAudioRef.current.pause();
       playbackAudioRef.current = null;
    }
    if (activeUrlRef.current) {
       URL.revokeObjectURL(activeUrlRef.current);
       activeUrlRef.current = null;
    }
    setActivePlaybackId(null);
  };

  const toggleVault = () => {
    setIsVaultOpen(!isVaultOpen);
    if (!isVaultOpen) fireMessage("VAULT OPEN", '(0_0)', 1500);
  };

  const handlePageChange = (page: number) => {
     setSynthPage(page);
     const msgs = ["OSC BANK", "AMP BANK", "MOD BANK", "FX BANK"];
     fireMessage(msgs[page], '(0_0)', 1500);
  };

  const handleRecordToggle = async () => {
    if (isRecording) {
      fireMessage("SAVING...", '(•_•)');
      setIsRecording(false);
      const blob = await stopRecording();
      if (blob) {
         const newRecording = {
            id: `rec_${Date.now()}`,
            name: `VOLT_REC_${new Date().toLocaleTimeString().replace(/\s/g, '_')}`,
            timestamp: Date.now(),
            blob: blob,
         };
         await saveRecording(newRecording);
         fireMessage("CLIP SAVED", '(^o^)', 2000);
         loadRecordings();
      } else {
         fireMessage("AUDIO ROUTE ERROR", '(T_T)', 2000);
      }
    } else {
      const started = startRecording();
      if (started) {
        setIsRecording(true);
        fireMessage("REC_ARMED", '(★_★)', 2000);
      } else {
        fireMessage("AUDIO ROUTE ERROR", '(T_T)', 2000);
      }
    }
  };

  const handlePresetLoad = (name: string) => {
    const preset = SYNTH_PRESETS[name];
    if (preset) {
        setParams(preset);
        fireMessage(`LOAD: ${name.toUpperCase()}`, '(⌐■_■)');
    }
  };

  const toggleSequencer = () => {
    setIsPlaying(p => {
       const np = !p;
       setStep(-1);
       if (np) fireMessage('SEQ: JAMMING', '(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧');
       else fireMessage('SEQ: STOPPED', '( ° ᴗ ° )');
       return np;
    });
  };

  const stopAll = () => {
    setIsPlaying(false);
    fireMessage('PANIC / ALL STOP', '(×_×)');
  };

  // Sequencer Engine
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setStep(s => {
        const next = (s + 1) % 16;
        if (next === 0 || next === 10) handleDrumTrigger('kick', 'SEQ', true);
        if (next === 4 || next === 12) handleDrumTrigger('snare', 'SEQ', true);
        if (next % 2 === 0) handleDrumTrigger('c-hat', 'SEQ', true);
        
        if (Math.random() > 0.85) {
             if (next === 14) handleDrumTrigger('o-hat', 'SEQ', true);
             if (next === 7) handleDrumTrigger('tom', 'SEQ', true);
             if (next === 15) handleDrumTrigger('clap', 'SEQ', true);
        }
        return next;
      });
    }, 120); 
    return () => clearInterval(interval);
  }, [isPlaying]);
  
  // Digital Buddy animation logic
  useEffect(() => {
    const buddyFaces = {
      idle: ['( ° ᴗ ° )', '( º _ º )', '( -_•)', '( ˘ ▾ ˘ )', '( ಠ ಠ )', '(⌐■_■)', '( •_•)', '(>_<)', 'ʕ•ᴥ•ʔ', '(O_O)', '(★_★)'],
      playing: ['( ^ ▽ ^ )', 'd(^_^)b', '\\(°o°)/', '♪(┌・。・)┌', '(~‾▿‾)~', '(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧', '(⌐■_■)b', '(☆ω☆)', '(ﾉ>ω<)ﾉ', 'ᕕ( ᐛ )ᕗ']
    };
    
    let tick = 0;
    const interval = setInterval(() => {
       if (isFaceOverridden.current) return;
       
       const activeNotes = getActiveCount();
       if (activeNotes > 0) {
         setBuddyState(buddyFaces.playing[tick % buddyFaces.playing.length]);
         tick++;
       } else {
         if (Math.random() > 0.8) {
           setBuddyState(buddyFaces.idle[Math.floor(Math.random() * buddyFaces.idle.length)]);
         }
       }
    }, 400);

    return () => clearInterval(interval);
  }, [getActiveCount]);

  // Precision canvas oscilloscope render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dataArray = new Uint8Array(2048);
    let animationFrame: number;

    const draw = () => {
      getVisualData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#34d399'; // emerald-400
      ctx.beginPath();
      
      const sliceWidth = (canvas.width * 1.0) / dataArray.length;
      let x = 0;
      
      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * (canvas.height / 2);
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        
        x += sliceWidth;
      }
      
      ctx.stroke();
      
      // Neon bloom
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#10b981';
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      animationFrame = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationFrame);
  }, [getVisualData]);

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-2 sm:p-4 font-sans selection:bg-red-500/30 text-white relative">
      {!isPoweredOn && (
         <div className="absolute inset-0 bg-neutral-950/90 z-50 flex items-center justify-center backdrop-blur-sm">
            <button
               onClick={() => {
                  playDrum('zap');
                  setIsPoweredOn(true);
                  fireMessage("SYSTEM ONLINE", '(⌐■_■)', 2000);
               }}
               className="px-8 py-4 bg-gradient-to-b from-red-800 to-black border-2 border-red-500 rounded-lg text-white font-mono font-bold tracking-widest hover:border-red-400 hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] transition-all animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.3)]"
            >
               INITIALIZE AUDIO ENGINE
            </button>
         </div>
      )}
      
      {/* Background Logo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02]">
        <h1 className="text-[20rem] font-black tracking-tighter">VOLT</h1>
      </div>

      {/* Main Workstation Chassis */}
      <div className="w-full max-w-[1300px] brushed-metal rounded-xl shadow-[0_40px_80px_rgba(0,0,0,0.95),inset_0_2px_4px_rgba(255,255,255,0.08)] border border-[#2a2a2a] overflow-hidden relative z-10 flex flex-col">
        
        {/* Top Metallic Branding Rail */}
        <div className="w-full h-10 bg-gradient-to-b from-[#222] via-[#111] to-[#0a0a0a] border-b border-black flex justify-between px-8 items-center shadow-[inset_0_1px_rgba(255,255,255,0.1),0_5px_15px_rgba(0,0,0,0.5)] z-20">
           <span className="text-neutral-500 text-[11px] tracking-[0.5em] font-black flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.8)] border border-red-800"></div>
              VOLTSYNTH // <span className="text-neutral-600 font-medium tracking-[0.3em] font-mono">X-SERIES WORKSTATION</span>
           </span>
           <span className={`${isPoweredOn ? 'text-emerald-500/80' : 'text-neutral-600'} text-[10px] tracking-[0.3em] font-bold flex items-center gap-2 transition-colors`}>
             <Zap size={12} className={isPoweredOn ? 'fill-emerald-500' : 'fill-neutral-700'} /> {isPoweredOn ? 'AUDIO ENGINE: ON' : 'STANDBY'}
           </span>
        </div>
        
        {/* Main Control Panel Surface */}
        <div className="p-4 grid grid-cols-1 xl:grid-cols-[auto_1fr_auto] gap-x-8 gap-y-6 relative bg-transparent">
          
          {/* Left Block: Multi-Page Parameters Matrix */}
          <div className="flex flex-col gap-4 bg-[#0a0a0a] p-5 rounded-xl border border-[#222] shadow-[inset_0_5px_15px_rgba(0,0,0,0.8)] min-w-[340px]">
             <div className="flex justify-between items-center mb-2 px-2 border-b border-neutral-800 pb-2">
                <span className="text-neutral-500 text-[10px] tracking-[0.3em] font-bold shrink-0 flex items-center gap-2"><Settings2 size={12} /> SYNTH PARAMS</span>
                <div className="flex gap-1">
                   {[0, 1, 2, 3].map(page => (
                      <button 
                        key={page} 
                        onClick={() => handlePageChange(page)}
                        title={`Page ${page+1}`}
                        className={`w-2 h-2 rounded-full transition-all ${synthPage === page ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]' : 'bg-neutral-800 hover:bg-neutral-600'}`}
                      ></button>
                   ))}
                </div>
             </div>
             
             <div className="grid grid-cols-4 gap-y-8 gap-x-4 place-items-center h-[260px] content-start">
                
                {synthPage === 0 && (
                  <>
                     {/* Row 1: OSC */}
                     <Knob label="OSC1 LVL" value={params.osc1Level} min={0} max={1} onChange={(v) => handleParamChange('osc1Level', v, `${Math.round(v*100)}%`)} formatValue={(v) => `${Math.round(v*100)}%`} />
                     <Knob label="OSC2 LVL" value={params.osc2Level} min={0} max={1} onChange={(v) => handleParamChange('osc2Level', v, `${Math.round(v*100)}%`)} formatValue={(v) => `${Math.round(v*100)}%`} />
                     <Knob label="DETUNE" value={params.osc2Detune} min={0} max={100} onChange={(v) => handleParamChange('osc2Detune', v, `${Math.round(v)}c`)} formatValue={(v) => `${Math.round(v)}c`} />
                     <Knob label="DRIVE" value={params.drive} min={0} max={1} onChange={(v) => handleParamChange('drive', v, `${Math.round(v*100)}%`)} formatValue={(v) => `${Math.round(v*100)}%`} />
                     
                     {/* Row 2: FILTER */}
                     <Knob label="CUTOFF" value={params.cutoff} min={20} max={20000} onChange={(v) => handleParamChange('cutoff', v, `${Math.round(v)}Hz`)} formatValue={(v) => `${Math.round(v)}Hz`} />
                     <Knob label="RESO" value={params.resonance} min={0} max={30} onChange={(v) => handleParamChange('resonance', v, v.toFixed(1))} formatValue={(v) => v.toFixed(1)} />
                     <Knob label="F-ENV" value={params.filterEnv} min={0} max={5000} onChange={(v) => handleParamChange('filterEnv', v, `${Math.round(v)}Hz`)} formatValue={(v) => `${Math.round(v)}Hz`} />
                     
                     {/* Disabled placeholder for visual density */}
                     <div className="flex flex-col items-center gap-2 opacity-30 pointer-events-none">
                        <div className="w-10 h-10 rounded-full border border-neutral-700 bg-black flex items-center justify-center">
                           <div className="w-1 h-3 bg-neutral-600 rounded-full"></div>
                        </div>
                        <span className="text-[8px] font-bold tracking-widest text-[#555] uppercase">MOD-ENV</span>
                     </div>
                  </>
                )}

                {synthPage === 1 && (
                  <>
                     <Knob label="ATTACK" value={params.attack} min={0.01} max={2.0} onChange={(v) => handleParamChange('attack', v, `${v.toFixed(2)}s`)} formatValue={(v) => `${v.toFixed(2)}s`} />
                     <Knob label="DECAY" value={params.decay} min={0.01} max={2.0} onChange={(v) => handleParamChange('decay', v, `${v.toFixed(2)}s`)} formatValue={(v) => `${v.toFixed(2)}s`} />
                     <Knob label="SUSTAIN" value={params.sustain} min={0} max={1.0} onChange={(v) => handleParamChange('sustain', v, `${Math.round(v*100)}%`)} formatValue={(v) => `${Math.round(v*100)}%`} />
                     <Knob label="RELEASE" value={params.release} min={0.01} max={5.0} onChange={(v) => handleParamChange('release', v, `${v.toFixed(2)}s`)} formatValue={(v) => `${v.toFixed(2)}s`} />
                     
                     <Knob label="AMP LVL" value={params.volume} min={0} max={1} onChange={(v) => handleParamChange('volume', v, `${Math.round(v*100)}%`)} formatValue={(v) => `${Math.round(v*100)}%`} />
                     
                     {['VELOCITY', 'GLIDE', 'PAN'].map(label => (
                       <div key={label} className="flex flex-col items-center gap-2 opacity-30 pointer-events-none">
                          <div className="w-10 h-10 rounded-full border border-neutral-700 bg-black flex items-center justify-center">
                             <div className="w-1 h-3 bg-neutral-600 rounded-full cursor-not-allowed"></div>
                          </div>
                          <span className="text-[8px] font-bold tracking-widest text-[#555] uppercase">{label}</span>
                       </div>
                     ))}
                  </>
                )}

                {synthPage === 2 && (
                  <>
                     <Knob label="LFO RATE" value={params.lfoRate} min={0.1} max={20} onChange={(v) => handleParamChange('lfoRate', v, `${v.toFixed(1)}Hz`)} formatValue={(v) => `${v.toFixed(1)}Hz`} />
                     <Knob label="LFO DEPTH" value={params.lfoDepth} min={0} max={1} onChange={(v) => handleParamChange('lfoDepth', v, `${Math.round(v*100)}%`)} formatValue={(v) => `${Math.round(v*100)}%`} />
                     
                     {['LFO SHP', 'FLT MOD', 'PTC MOD', 'AMP MOD', 'SYNC', 'STEP X'].map(label => (
                       <div key={label} className="flex flex-col items-center gap-2 opacity-30 pointer-events-none">
                          <div className="w-10 h-10 rounded-full border border-neutral-700 bg-black flex items-center justify-center">
                             <div className="w-1 h-3 bg-neutral-600 rounded-full cursor-not-allowed"></div>
                          </div>
                          <span className="text-[8px] font-bold tracking-widest text-[#555] uppercase">{label}</span>
                       </div>
                     ))}
                  </>
                )}

                {synthPage === 3 && (
                  <>
                     <Knob label="D-TIME" value={params.delayTime} min={0} max={1} onChange={(v) => handleParamChange('delayTime', v, `${Math.round(v*1000)}ms`)} formatValue={(v) => `${Math.round(v*1000)}ms`} />
                     <Knob label="D-FEED" value={params.delayFeedback} min={0} max={0.9} onChange={(v) => handleParamChange('delayFeedback', v, `${Math.round(v*100)}%`)} formatValue={(v) => `${Math.round(v*100)}%`} />
                     <Knob label="D-MIX" value={params.delayMix} min={0} max={1} onChange={(v) => handleParamChange('delayMix', v, `${Math.round(v*100)}%`)} formatValue={(v) => `${Math.round(v*100)}%`} />
                     
                     {['RVB SIZ', 'RVB MIX', 'CHO RAT', 'CHO DEP', 'COMP'].map(label => (
                       <div key={label} className="flex flex-col items-center gap-2 opacity-30 pointer-events-none">
                          <div className="w-10 h-10 rounded-full border border-neutral-700 bg-black flex items-center justify-center">
                             <div className="w-1 h-3 bg-neutral-600 rounded-full cursor-not-allowed"></div>
                          </div>
                          <span className="text-[8px] font-bold tracking-widest text-[#555] uppercase">{label}</span>
                       </div>
                     ))}
                  </>
                )}
             </div>
             
             {/* Switches */}
             {synthPage === 0 ? (
               <div className="mt-auto pt-4 border-t border-neutral-800 grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                     <span className="text-[9px] text-neutral-600 font-bold tracking-[0.2em] mb-1">OSC 1 SHAPE</span>
                     <div className="flex bg-black border border-neutral-800 rounded p-[3px] shadow-inner divide-x divide-neutral-800">
                       {(['sawtooth', 'square', 'sine'] as const).map(wave => (
                         <button key={wave} onClick={() => handleParamChange('osc1Wave', wave, wave.toUpperCase())}
                           className={`text-[9px] px-2 py-1 w-full font-bold transition-all ${params.osc1Wave === wave ? 'bg-[#333] text-red-500 shadow-[inset_0_1px_5px_rgba(0,0,0,1)]' : 'text-neutral-600 hover:text-neutral-400'}`}
                         >{wave.substring(0,3)}</button>
                       ))}
                     </div>
                  </div>
                  <div className="flex flex-col gap-1">
                     <span className="text-[9px] text-neutral-600 font-bold tracking-[0.2em] mb-1">OSC 2 SHAPE</span>
                     <div className="flex bg-black border border-neutral-800 rounded p-[3px] shadow-inner divide-x divide-neutral-800">
                       {(['sawtooth', 'square', 'sine', 'triangle'] as const).map(wave => (
                         <button key={wave} onClick={() => handleParamChange('osc2Wave', wave, wave.toUpperCase())}
                           className={`text-[9px] px-2 py-1 w-full font-bold transition-all ${params.osc2Wave === wave ? 'bg-[#333] text-blue-500 shadow-[inset_0_1px_5px_rgba(0,0,0,1)]' : 'text-neutral-600 hover:text-neutral-400'}`}
                         >{wave.substring(0,3)}</button>
                       ))}
                     </div>
                  </div>
               </div>
             ) : (
               <div className="mt-auto pt-4 border-t border-neutral-800 grid grid-cols-3 gap-2">
                 {/* Adding functional toggles for LP/BP/HP if we want, or mode options */}
                  <div className="flex flex-col gap-1 col-span-2">
                     <span className="text-[9px] text-neutral-600 font-bold tracking-[0.2em] mb-1">FILTER MODE</span>
                     <div className="flex bg-black border border-neutral-800 rounded p-[3px] shadow-inner divide-x divide-neutral-800">
                       {(['lowpass', 'bandpass', 'highpass'] as const).map(fmode => (
                         <button key={fmode} onClick={() => handleParamChange('filterType', fmode, fmode.toUpperCase())}
                           className={`text-[9px] px-2 py-1 w-full font-bold transition-all ${params.filterType === fmode ? 'bg-[#333] text-green-500 shadow-[inset_0_1px_5px_rgba(0,0,0,1)]' : 'text-neutral-600 hover:text-neutral-400'}`}
                         >{fmode === 'lowpass' ? 'LP' : fmode === 'highpass' ? 'HP' : 'BP'}</button>
                       ))}
                     </div>
                  </div>
                  <div className="flex flex-col gap-1">
                     <span className="text-[9px] text-neutral-600 font-bold tracking-[0.2em] mb-1">VOICE</span>
                     <div className="flex bg-black border border-neutral-800 rounded p-[3px] shadow-inner divide-x divide-neutral-800">
                         <button className="text-[9px] px-2 py-1 w-full font-bold transition-all bg-[#333] text-purple-500 shadow-[inset_0_1px_5px_rgba(0,0,0,1)]">POLY</button>
                         <button disabled className="text-[9px] px-2 py-1 w-full font-bold text-neutral-800 cursor-not-allowed">MONO</button>
                     </div>
                  </div>
               </div>
             )}
          </div>

          {/* Center Block: Display Screen & 16-Pad Grid */}
          <div className="flex flex-col items-center gap-6 w-full max-w-[600px] mx-auto mt-2">
            
            {/* Presets Banks */}
            <div className="flex flex-col w-full relative z-20 bg-[#080808] border border-[#222] rounded shadow-[inset_0_2px_5px_rgba(0,0,0,0.8)] divide-y divide-[#222]">
               <div className="flex items-center gap-2 px-3 py-1.5 w-full justify-between">
                  <span className="text-[9px] text-emerald-800 font-bold tracking-[0.2em] flex items-center gap-1 w-14 shrink-0"><Disc size={10} /> SYNTH</span>
                  <div className="flex gap-1.5 scrollbar-none overflow-x-auto w-full flex-nowrap">
                    {Object.keys(SYNTH_PRESETS).slice(0, 6).map(preset => (
                        <button key={preset} onClick={() => handlePresetLoad(preset)} className="text-[9px] text-neutral-400 hover:text-white transition-colors uppercase font-bold tracking-wider hover:bg-neutral-800 px-1.5 py-[2px] rounded whitespace-nowrap">
                          {preset}
                        </button>
                    ))}
                  </div>
               </div>
               <div className="flex items-center gap-2 px-3 py-1.5 w-full justify-between">
                  <span className="text-[9px] text-red-800 font-bold tracking-[0.2em] flex items-center gap-1 w-14 shrink-0"><Disc size={10} /> DRUM</span>
                  <div className="flex gap-1.5 scrollbar-none overflow-x-auto w-full flex-nowrap">
                    {Object.keys(SYNTH_PRESETS).slice(6, 12).map(preset => (
                        <button key={preset} onClick={() => handlePresetLoad(preset)} className="text-[9px] text-neutral-400 hover:text-white transition-colors uppercase font-bold tracking-wider hover:bg-neutral-800 px-1.5 py-[2px] rounded whitespace-nowrap">
                          {preset}
                        </button>
                    ))}
                  </div>
               </div>
               <div className="flex items-center gap-2 px-3 py-1.5 w-full justify-between">
                  <span className="text-[9px] text-blue-800 font-bold tracking-[0.2em] flex items-center gap-1 w-14 shrink-0"><Disc size={10} /> WKST</span>
                  <div className="flex gap-1.5 scrollbar-none overflow-x-auto w-full flex-nowrap">
                    {Object.keys(SYNTH_PRESETS).slice(12, 18).map(preset => (
                        <button key={preset} onClick={() => handlePresetLoad(preset)} className="text-[9px] text-neutral-400 hover:text-white transition-colors uppercase font-bold tracking-wider hover:bg-neutral-800 px-1.5 py-[2px] rounded whitespace-nowrap">
                          {preset}
                        </button>
                    ))}
                  </div>
               </div>
            </div>

            {/* Massive Display Terminal */}
            <div className="w-full h-36 bg-[#040c06] border-4 border-[#0a0a0a] rounded-lg shadow-[0_10px_20px_rgba(0,0,0,0.8),inset_0_0_30px_rgba(0,0,0,1),0_0_0_1px_rgba(255,255,255,0.05)] p-4 flex flex-col font-mono text-emerald-400 relative overflow-hidden group">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[size:100%_4px] pointer-events-none z-10" />
              <div className="absolute inset-0 bg-emerald-900/10 shadow-[inset_0_0_40px_rgba(0,0,0,1)] pointer-events-none z-10" />
              
              <div className="w-full flex justify-between absolute top-4 px-4 z-20">
                 <div className="flex flex-col text-[10px] gap-1">
                    <span className="text-emerald-300 font-bold opacity-100">&gt; {systemMessage}</span>
                    <span className="opacity-60">VCF_FREQ: {params.cutoff.toFixed(0)}Hz</span>
                    <span className="opacity-60">DELAY_FB: {params.delayFeedback.toFixed(2)}</span>
                 </div>
                 <div className="flex flex-col items-end text-xl font-bold tracking-tight text-emerald-300 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">
                    {buddyState}
                 </div>
              </div>

              {/* Central Real-time Scope */}
              <div className="absolute inset-0 z-0 flex items-center justify-center pt-8">
                 <canvas ref={canvasRef} width={500} height={80} className="w-[90%] h-[70%] mix-blend-screen opacity-90" />
              </div>
            </div>

            {/* 16 Pad MPC-Style Grid */}
            <div className="w-full grid grid-cols-4 gap-4 justify-center bg-[#0d0d0d] p-5 rounded-xl border border-[#222] shadow-[inset_0_10px_20px_rgba(0,0,0,0.9),0_5px_15px_rgba(0,0,0,0.5)]">
               {/* Note: mapped sequentially to form 4x4 */}
               <Pad label="KICK" color="red" onTrigger={() => handleDrumTrigger('kick', 'KICK')} />
               <Pad label="SUB" color="red" onTrigger={() => handleDrumTrigger('sub', 'SUB', false, 1)} />
               <Pad label="SNARE" color="blue" onTrigger={() => handleDrumTrigger('snare', 'SNARE')} />
               <Pad label="CLAP" color="cyan" onTrigger={() => handleDrumTrigger('clap', 'CLAP')} />
               
               <Pad label="TOM LO" color="orange" onTrigger={() => handleDrumTrigger('tom', 'TOM LO', false, 0)} />
               <Pad label="TOM MID" color="orange" onTrigger={() => handleDrumTrigger('tom', 'TOM MID', false, 1)} />
               <Pad label="TOM HI" color="purple" onTrigger={() => handleDrumTrigger('tom', 'TOM HI', false, 2)} />
               <Pad label="RIM" color="blue" onTrigger={() => handleDrumTrigger('rim', 'RIM')} />
               
               <Pad label="C-HAT" color="green" onTrigger={() => handleDrumTrigger('c-hat', 'C-HAT')} />
               <Pad label="O-HAT" color="green" onTrigger={() => handleDrumTrigger('o-hat', 'O-HAT')} />
               <Pad label="COWBELL" color="yellow" onTrigger={() => handleDrumTrigger('cowbell', 'COWBELL')} />
               <Pad label="ZAP" color="purple" onTrigger={() => handleDrumTrigger('zap', 'ZAP')} />
               
               <Pad label="CRASH 1" color="yellow" onTrigger={() => handleDrumTrigger('crash', 'CRASH 1')} />
               <Pad label="RIDE" color="green" onTrigger={() => handleDrumTrigger('ride', 'RIDE')} />
               <Pad label="CRASH 2" color="yellow" onTrigger={() => handleDrumTrigger('crash', 'CRASH 2', false, 1)} />
               <Pad label="NOISE" color="purple" onTrigger={() => handleDrumTrigger('zap', 'NOISE', false, 2)} />
            </div>
          </div>

          {/* Right Block: Pitch/Mod, Faders, Master */}
          <div className="flex flex-col gap-6 items-center w-max ml-auto bg-[#0a0a0a] p-5 rounded-xl border border-[#222] shadow-[inset_0_5px_15px_rgba(0,0,0,0.8)] h-full justify-between pb-6">
             
             <div className="flex justify-between w-full px-2">
                <span className="text-neutral-500 text-[10px] tracking-[0.3em] font-bold flex items-center gap-2"><Sliders size={12} /> MODULATION</span>
             </div>

             {/* Wheels */}
             <div className="flex gap-4">
                <Wheel label="PITCH" isPitch value={pitch} onChange={handlePitch} />
                <Wheel label="MOD" value={mod} onChange={handleMod} />
             </div>

             {/* ADSR Faders */}
             <div className="flex gap-4 pt-4 border-t border-neutral-800 w-full justify-center">
                <Fader label="ATTACK" value={params.attack} min={0.01} max={2.0} onChange={(v) => handleParamChange('attack', v, `${v.toFixed(2)}s`)} />
                <Fader label="DECAY" value={params.decay} min={0.01} max={2.0} onChange={(v) => handleParamChange('decay', v, `${v.toFixed(2)}s`)} />
                <Fader label="SUSTAIN" value={params.sustain} min={0} max={1.0} onChange={(v) => handleParamChange('sustain', v, `${Math.round(v*100)}%`)} />
                <Fader label="RELEASE" value={params.release} min={0.01} max={5.0} onChange={(v) => handleParamChange('release', v, `${v.toFixed(2)}s`)} />
             </div>

             {/* Global / Transport Section */}
             <div className="flex gap-4 pt-4 border-t border-neutral-800 w-full items-center justify-between px-2">
                
                {/* Transport Buttons */}
                <div className="flex gap-2">
                  <button onClick={stopAll} className="h-10 w-10 flex items-center justify-center bg-gradient-to-b from-[#333] to-[#111] rounded shadow-[0_2px_5px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] border border-[#222] text-neutral-400 hover:text-white transition-colors" title="Stop Sequence / Panic"><Square size={14} fill="currentColor" /></button>
                  <button onClick={toggleSequencer} className={`h-10 w-10 flex items-center justify-center rounded shadow-[0_2px_5px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] border transition-colors ${isPlaying ? 'bg-[#0a2e1d] border-emerald-800 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-gradient-to-b from-[#333] to-[#111] border-[#222] text-neutral-400 hover:text-emerald-400'}`} title={isPlaying ? "Stop Loop" : "Play Loop"}><Play size={14} fill="currentColor" /></button>
                  <button 
                    onClick={handleRecordToggle}
                    className={`h-10 w-10 flex items-center justify-center rounded border transition-colors shadow-[0_2px_5px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] ${isRecording ? 'bg-[#3b0a0a] border-red-800 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-gradient-to-b from-[#333] to-[#111] border-[#222] text-neutral-400 hover:text-white'}`}
                    title={isRecording ? "Stop Recording" : "Record Audio to WebM"}
                  >
                    <Circle size={12} fill="currentColor" className={isRecording ? 'animate-pulse' : ''} />
                  </button>
                </div>

                <div className="flex items-center gap-2 pr-1">
                   <Volume2 size={14} className="text-neutral-500" />
                   <Knob label="MASTER" value={params.volume} min={0} max={1} onChange={(v) => handleParamChange('volume', v, `${Math.round(v*100)}%`)} />
                </div>

             </div>
          </div>
          
        </div>

        {/* Keyboard Section beneath controls */}
        <div className="mt-0 w-full bg-[#0a0a0a] pt-1">
           <div className="w-full h-1.5 bg-gradient-to-r from-red-800 via-red-600 to-red-800 shadow-[0_-2px_20px_rgba(239,68,68,0.3)] relative z-20">
              {isRecording && <div className="absolute inset-0 bg-white/30 animate-pulse"></div>}
           </div>
           <Keyboard startOctave={3} numKeys={40} onNoteOn={handleNoteOn} onNoteOff={noteOff} />
        </div>
        
        {/* Modal: Vault Panel Overlay */}
        {isVaultOpen && (
           <VaultPanel 
              recordings={recordings}
              onClose={() => setIsVaultOpen(false)}
              onRefresh={loadRecordings}
              activePlaybackId={activePlaybackId}
              onPlay={handlePlayRecording}
              onStop={handleStopRecordingPlayback}
              fireMessage={fireMessage}
           />
        )}
      </div>
      
      {/* Dynamic Footer Instructions */}
      <div className="mt-6 text-neutral-600 text-[10px] text-center font-mono tracking-widest flex items-center justify-center gap-4 uppercase font-bold">
        <span>Keyboard Active</span>
        <span className="w-[3px] h-3 bg-red-800/50 rounded-full"></span>
        <span>Output: {isRecording ? 'Recording (Live)' : 'Standby'}</span>
      </div>
    </div>
  );
}
