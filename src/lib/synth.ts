import { useEffect, useRef, useState } from 'react';

// --- Types ---
export type Waveform = 'sawtooth' | 'square' | 'triangle' | 'sine';

export interface SynthParams {
  osc1Wave: Waveform;
  osc1Level: number;   // 0.0 - 1.0
  osc2Wave: Waveform;
  osc2Level: number;   // 0.0 - 1.0
  osc2Detune: number;  // 0 - 100 cents
  
  filterType: 'lowpass' | 'highpass' | 'bandpass';
  cutoff: number;      // 20 - 20000 Hz
  resonance: number;   // 0 - 30
  filterEnv: number;   // -5000 - +5000
  
  attack: number;      // 0.01 - 2.0 s
  decay: number;       // 0.01 - 2.0 s
  sustain: number;     // 0.0 - 1.0
  release: number;     // 0.01 - 5.0 s
  
  lfoRate: number;     // 0.1 - 20.0 Hz
  lfoDepth: number;    // 0 - 1.0
  
  delayTime: number;   // 0 - 1.0 s
  delayFeedback: number; // 0 - 0.9
  delayMix: number;    // 0 - 1.0
  drive: number;       // 0 - 1.0
  volume: number;      // 0 - 1.0
}

export const defaultParams: SynthParams = {
  osc1Wave: 'sawtooth',
  osc1Level: 0.8,
  osc2Wave: 'square',
  osc2Level: 0.5,
  osc2Detune: 15,
  
  filterType: 'lowpass',
  cutoff: 3500,
  resonance: 8,
  filterEnv: 1000,
  
  attack: 0.05,
  decay: 0.3,
  sustain: 0.6,
  release: 0.8,
  
  lfoRate: 6.0,
  lfoDepth: 0.1,
  
  delayTime: 0.33,
  delayFeedback: 0.4,
  delayMix: 0.2,
  drive: 0.1,
  volume: 0.8,
};

export const SYNTH_PRESETS: Record<string, Partial<SynthParams>> = {
  // SYNTH
  'Dusk Drive': {
    osc1Wave: 'sawtooth', osc2Wave: 'sawtooth',
    osc1Level: 0.8, osc2Level: 0.5,
    osc2Detune: 20, cutoff: 1500, resonance: 4, filterEnv: 800,
    attack: 0.05, decay: 0.5, sustain: 0.5, release: 0.8,
    drive: 0.5, delayMix: 0.3, delayFeedback: 0.4, lfoDepth: 0.1
  },
  'Neon Bass': {
    osc1Wave: 'square', osc2Wave: 'square',
    osc1Level: 1.0, osc2Level: 0.8,
    osc2Detune: 12, cutoff: 400, resonance: 15, filterEnv: 2500,
    attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.3,
    drive: 0.9, delayMix: 0.1, lfoDepth: 0.0
  },
  'Glass Keys': {
    osc1Wave: 'sine', osc2Wave: 'triangle',
    osc1Level: 0.6, osc2Level: 0.9,
    osc2Detune: 7, cutoff: 8000, resonance: 2, filterEnv: 0,
    attack: 0.01, decay: 0.1, sustain: 0.8, release: 1.5,
    drive: 0.0, delayMix: 0.5, delayFeedback: 0.5, lfoDepth: 0.2
  },
  'Deep Space': {
    osc1Wave: 'sine', osc2Wave: 'sine',
    osc1Level: 1.0, osc2Level: 1.0,
    osc2Detune: 15, cutoff: 600, resonance: 8, filterEnv: 500,
    attack: 1.2, decay: 1.0, sustain: 0.9, release: 3.0,
    drive: 0.1, delayMix: 0.7, delayFeedback: 0.8, lfoDepth: 0.4, lfoRate: 2.0
  },
  'Soft Pulse': {
    osc1Wave: 'triangle', osc2Wave: 'square',
    osc1Level: 0.8, osc2Level: 0.3,
    osc2Detune: 5, cutoff: 1800, resonance: 12, filterEnv: -800,
    attack: 0.1, decay: 0.3, sustain: 0.5, release: 0.6,
    drive: 0.2, delayMix: 0.2, lfoDepth: 0.6, lfoRate: 8.0
  },
  'Redline Lead': {
    osc1Wave: 'sawtooth', osc2Wave: 'square',
    osc1Level: 0.9, osc2Level: 0.9,
    osc2Detune: 25, cutoff: 6000, resonance: 20, filterEnv: 2000,
    attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.2,
    drive: 0.8, delayMix: 0.4, delayFeedback: 0.6, lfoDepth: 0.1
  },

  // DRUM / WORKSTATION equivalents
  'Redline Kit': {
    osc1Wave: 'square', osc2Wave: 'sawtooth',
    osc1Level: 0.7, osc2Level: 0.9,
    osc2Detune: 40, cutoff: 4000, resonance: 8, filterEnv: 1000,
    attack: 0.02, decay: 0.1, sustain: 0.0, release: 0.1,
    drive: 1.0, delayMix: 0.0, lfoDepth: 0.0
  },
  'Metal Room': {
    osc1Wave: 'triangle', osc2Wave: 'sine',
    osc1Level: 1.0, osc2Level: 0.5,
    osc2Detune: 10, cutoff: 2000, resonance: 5, filterEnv: 200,
    attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.05,
    drive: 0.7, delayMix: 0.2, delayFeedback: 0.1, lfoDepth: 0.0
  },
  'Lo-Fi Tape': {
    osc1Wave: 'sine', osc2Wave: 'sawtooth',
    osc1Level: 0.6, osc2Level: 0.2,
    osc2Detune: 35, cutoff: 1200, resonance: 1, filterEnv: 0,
    attack: 0.1, decay: 0.4, sustain: 0.3, release: 0.5,
    drive: 0.3, delayMix: 0.5, delayFeedback: 0.2, lfoDepth: 0.8, lfoRate: 1.5
  },
  'Deep Knock': {
    osc1Wave: 'sine', osc2Wave: 'triangle',
    osc1Level: 1.0, osc2Level: 1.0,
    osc2Detune: 0, cutoff: 150, resonance: 2, filterEnv: 50,
    attack: 0.01, decay: 0.2, sustain: 0.0, release: 0.2,
    drive: 0.4, delayMix: 0.0, lfoDepth: 0.0
  },
  'Crystal Hats': {
    osc1Wave: 'sine', osc2Wave: 'sine',
    osc1Level: 0.1, osc2Level: 0.1,
    osc2Detune: 50, cutoff: 15000, resonance: 15, filterEnv: 4000,
    attack: 0.01, decay: 0.1, sustain: 0.0, release: 0.1,
    drive: 0.0, delayMix: 0.8, delayFeedback: 0.5, lfoDepth: 0.0
  },
  'Club Machine': {
    osc1Wave: 'sawtooth', osc2Wave: 'square',
    osc1Level: 0.8, osc2Level: 0.8,
    osc2Detune: 15, cutoff: 3500, resonance: 10, filterEnv: 1200,
    attack: 0.05, decay: 0.4, sustain: 0.4, release: 0.6,
    drive: 0.6, delayMix: 0.2, delayFeedback: 0.3, lfoDepth: 0.0
  },

  // WORKSTATION PRESETS
  'Starter Jam': {
    osc1Wave: 'sawtooth', osc2Wave: 'square',
    osc1Level: 0.8, osc2Level: 0.5,
    osc2Detune: 15, cutoff: 3500, resonance: 8, filterEnv: 1000,
    attack: 0.05, decay: 0.3, sustain: 0.6, release: 0.8,
    drive: 0.1, delayMix: 0.2, delayFeedback: 0.4, lfoDepth: 0.1
  },
  'Night Drive': {
    osc1Wave: 'sawtooth', osc2Wave: 'sawtooth',
    osc1Level: 0.9, osc2Level: 0.9,
    osc2Detune: 18, cutoff: 2200, resonance: 5, filterEnv: -500,
    attack: 0.1, decay: 0.6, sustain: 0.7, release: 1.0,
    drive: 0.3, delayMix: 0.6, delayFeedback: 0.6, lfoDepth: 0.2, lfoRate: 4.0
  },
  'Boss Fight': {
    osc1Wave: 'square', osc2Wave: 'sawtooth',
    osc1Level: 1.0, osc2Level: 0.9,
    osc2Detune: 45, cutoff: 6000, resonance: 25, filterEnv: 3000,
    attack: 0.01, decay: 0.2, sustain: 0.8, release: 0.5,
    drive: 0.9, delayMix: 0.3, delayFeedback: 0.4, lfoDepth: 0.5, lfoRate: 15.0
  },
  'Space Lab': {
    osc1Wave: 'sine', osc2Wave: 'sine',
    osc1Level: 1.0, osc2Level: 0.7,
    osc2Detune: 7, cutoff: 400, resonance: 20, filterEnv: 200,
    attack: 0.8, decay: 1.5, sustain: 0.5, release: 4.0,
    drive: 0.0, delayMix: 0.9, delayFeedback: 0.8, lfoDepth: 0.8, lfoRate: 1.2
  },
  'Chill Circuit': {
    osc1Wave: 'triangle', osc2Wave: 'triangle',
    osc1Level: 0.8, osc2Level: 0.8,
    osc2Detune: 10, cutoff: 2800, resonance: 10, filterEnv: 800,
    attack: 0.05, decay: 0.5, sustain: 0.4, release: 0.8,
    drive: 0.2, delayMix: 0.4, delayFeedback: 0.5, lfoDepth: 0.3, lfoRate: 6.0
  },
  'Dark Arcade': {
    osc1Wave: 'square', osc2Wave: 'square',
    osc1Level: 0.9, osc2Level: 0.6,
    osc2Detune: 0, cutoff: 8000, resonance: 5, filterEnv: -1000,
    attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.2,
    drive: 1.0, delayMix: 0.2, delayFeedback: 0.2, lfoDepth: 0.9, lfoRate: 20.0
  }
};

function makeDistortionCurve(amount: number) {
  const k = amount * 50;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = i * 2 / n_samples - 1;
    curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

// --- Web Audio Engine ---
class SynthEngine {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  
  // FX & Visualization
  delayNode: DelayNode | null = null;
  delayFeedback: GainNode | null = null;
  delayMix: GainNode | null = null;
  driveNode: WaveShaperNode | null = null;
  analyser: AnalyserNode | null = null;
  
  // Recording
  mediaStreamDestination: MediaStreamAudioDestinationNode | null = null;
  mediaRecorder: MediaRecorder | null = null;
  recordedChunks: Blob[] = [];
  
  // Modulation
  lfo: OscillatorNode | null = null;
  lfoGain: GainNode | null = null;
  pitchBend: number = 0; // -1 to 1

  activeVoices: Map<number, { osc1: OscillatorNode; osc2: OscillatorNode; val: GainNode; filter: BiquadFilterNode }> = new Map();
  params: SynthParams = { ...defaultParams };

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.params.volume;

    // Output analyser for the awesome screen
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;

    // Recording Setup
    this.mediaStreamDestination = this.ctx.createMediaStreamDestination();

    // Drive Setup
    this.driveNode = this.ctx.createWaveShaper();
    this.driveNode.curve = makeDistortionCurve(this.params.drive);
    this.driveNode.oversample = '4x';

    // Delay FX Setup
    this.delayNode = this.ctx.createDelay(2.0);
    this.delayFeedback = this.ctx.createGain();
    this.delayMix = this.ctx.createGain();

    this.delayNode.delayTime.value = this.params.delayTime;
    this.delayFeedback.gain.value = 0.4;
    this.delayMix.gain.value = this.params.delayMix;

    // Setup LFO (global per keyboard)
    this.lfo = this.ctx.createOscillator();
    this.lfo.frequency.value = this.params.lfoRate;
    this.lfoGain = this.ctx.createGain();
    this.lfoGain.gain.value = this.params.lfoDepth * 100; // Mod depth
    this.lfo.connect(this.lfoGain);
    this.lfo.start();

    // Routing
    // Master -> Drive -> Analyser -> Destination / Recorder
    // Master -> Drive -> Delay -> Mix -> Analyser -> Destination
    
    this.masterGain.connect(this.driveNode!);
    this.driveNode!.connect(this.delayNode!);
    
    this.delayNode!.connect(this.delayFeedback!);
    this.delayFeedback!.connect(this.delayNode!); // feedback loop
    this.delayNode!.connect(this.delayMix!);
    
    this.driveNode!.connect(this.analyser);
    this.delayMix!.connect(this.analyser);
    
    this.analyser.connect(this.ctx.destination);
    this.analyser.connect(this.mediaStreamDestination);
  }

  updateParams(newParams: SynthParams) {
    this.params = newParams;
    if (this.masterGain) this.masterGain.gain.value = newParams.volume;
    if (this.delayNode) this.delayNode.delayTime.value = newParams.delayTime;
    if (this.delayFeedback) this.delayFeedback.gain.value = newParams.delayFeedback;
    if (this.delayMix) this.delayMix.gain.value = newParams.delayMix;
    if (this.driveNode) this.driveNode.curve = makeDistortionCurve(newParams.drive);
    if (this.lfo) this.lfo.frequency.value = newParams.lfoRate;
    // Mod wheel adds to base depth
    const totalDepth = Math.min(newParams.lfoDepth + this.modWheel, 1.0);
    if (this.lfoGain) this.lfoGain.gain.value = totalDepth * 200;

    // Update real-time active voices for detune
    this.activeVoices.forEach((voice) => {
      // Refresh types / detune for active notes
      voice.osc1.type = newParams.osc1Wave;
      voice.osc2.type = newParams.osc2Wave;
      // Recalculate detune if changed while holding note
      voice.osc2.detune.setTargetAtTime(newParams.osc2Detune + (this.pitchBend * 200), this.ctx!.currentTime, 0.05);
    });
  }

  modWheel: number = 0; // State for mod wheel

  setPitch(val: number) {
    this.pitchBend = val;
    if (!this.ctx) return;
    // Map -1..1 to -200..200 cents (+/- 2 semitones)
    const baseDetune = val * 200;
    this.activeVoices.forEach(voice => {
        voice.osc1.detune.setTargetAtTime(baseDetune, this.ctx!.currentTime, 0.05);
        voice.osc2.detune.setTargetAtTime(this.params.osc2Detune + baseDetune, this.ctx!.currentTime, 0.05);
    });
  }

  setMod(val: number) {
    this.modWheel = val;
    if (!this.ctx || !this.lfoGain) return;
    const totalDepth = Math.min(this.params.lfoDepth + this.modWheel, 1.0);
    this.lfoGain.gain.setTargetAtTime(totalDepth * 200, this.ctx.currentTime, 0.05);
  }

  getVisualData(dataArray: Uint8Array) {
    if (this.analyser) {
        this.analyser.getByteTimeDomainData(dataArray);
    } else {
        for (let i = 0; i < dataArray.length; i++) dataArray[i] = 128;
    }
  }
  
  startRecording() {
    if (!this.ctx) this.init();
    if (!this.mediaStreamDestination) return false;
    
    this.recordedChunks = [];
    try {
      this.mediaRecorder = new MediaRecorder(this.mediaStreamDestination.stream);
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.recordedChunks.push(e.data);
      };
      this.mediaRecorder.start();
      return true;
    } catch (e) {
      console.error("Recording not supported or failed", e);
      return false;
    }
  }

  stopRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.onstop = () => {
          const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
          resolve(blob);
        };
        this.mediaRecorder.stop();
      } else {
        resolve(null);
      }
    });
  }

  noteOn(note: number, velocity: number = 127) {
    if (!this.ctx) this.init();
    if (this.ctx?.state === 'suspended') this.ctx.resume();
    
    this.noteOff(note); // Kill existing note if active

    const osc1 = this.ctx!.createOscillator();
    const osc2 = this.ctx!.createOscillator();
    const filter = this.ctx!.createBiquadFilter();
    const val = this.ctx!.createGain();

    // Dual oscillator mixing
    const osc1Gain = this.ctx!.createGain();
    const osc2Gain = this.ctx!.createGain();
    osc1Gain.gain.value = this.params.osc1Level;
    osc2Gain.gain.value = this.params.osc2Level;

    const freq = 440 * Math.pow(2, (note - 69) / 12);
    osc1.type = this.params.osc1Wave;
    osc1.frequency.value = freq;
    
    osc2.type = this.params.osc2Wave;
    osc2.frequency.value = freq;
    
    // Apply pitch bend & detune
    const baseBend = this.pitchBend * 200;
    osc1.detune.value = baseBend;
    osc2.detune.value = this.params.osc2Detune + baseBend;

    if (this.lfoGain) {
        this.lfoGain.connect(osc1.detune);
        this.lfoGain.connect(osc2.detune);
    }

    // Filter Setup
    filter.type = this.params.filterType as BiquadFilterType;
    filter.Q.value = this.params.resonance;
    
    // Envelope on filter
    const baseC = Math.max(10, Math.min(20000, this.params.cutoff));
    const peakC = Math.max(10, Math.min(20000, baseC + this.params.filterEnv));
    filter.frequency.setValueAtTime(baseC, this.ctx!.currentTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(10, peakC), this.ctx!.currentTime + this.params.attack + 0.01);
    filter.frequency.exponentialRampToValueAtTime(Math.max(10, baseC + (this.params.filterEnv * this.params.sustain)), this.ctx!.currentTime + this.params.attack + this.params.decay + 0.01);

    // VCA Envelope
    val.gain.setValueAtTime(0, this.ctx!.currentTime);
    val.gain.linearRampToValueAtTime((velocity / 127), this.ctx!.currentTime + this.params.attack + 0.01);
    val.gain.exponentialRampToValueAtTime((velocity / 127) * Math.max(0.01, this.params.sustain), this.ctx!.currentTime + this.params.attack + this.params.decay + 0.01);

    osc1.connect(osc1Gain);
    osc2.connect(osc2Gain);
    osc1Gain.connect(filter);
    osc2Gain.connect(filter);
    
    filter.connect(val);
    val.connect(this.masterGain!);

    osc1.start();
    osc2.start();
    this.activeVoices.set(note, { osc1, osc2, val, filter });
  }

  noteOff(note: number) {
    if (!this.ctx) return;
    const voice = this.activeVoices.get(note);
    if (voice) {
      voice.val.gain.cancelScheduledValues(this.ctx.currentTime);
      voice.val.gain.setValueAtTime(voice.val.gain.value, this.ctx.currentTime);
      voice.val.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + this.params.release);
      
      voice.osc1.stop(this.ctx.currentTime + this.params.release + 0.1);
      voice.osc2.stop(this.ctx.currentTime + this.params.release + 0.1);
      
      setTimeout(() => {
        voice.osc1.disconnect();
        voice.osc2.disconnect();
        voice.filter.disconnect();
        voice.val.disconnect();
      }, (this.params.release + 0.2) * 1000);

      this.activeVoices.delete(note);
    }
  }

  playDrum(type: 'kick' | 'snare' | 'hihat' | 'tom' | 'crash' | 'clap' | 'rim' | 'cowbell' | 'sub' | 'zap' | 'c-hat' | 'o-hat' | 'ride', variant: number = 0) {
    if (!this.ctx) this.init();
    if (this.ctx?.state === 'suspended') this.ctx.resume();
    
    const t = this.ctx!.currentTime;
    
    if (type === 'kick') {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.connect(gain);
      gain.connect(this.masterGain!);
      
      const startFreq = 150 + (variant * 30);
      const endFreq = 0.01;
      osc.frequency.setValueAtTime(startFreq, t);
      osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.5);
      gain.gain.setValueAtTime(1, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
      
      osc.start(t);
      osc.stop(t + 0.5);
    } 
    else if (type === 'sub') {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.connect(gain);
      gain.connect(this.masterGain!);
      
      const freq = 45 + (variant * 10);
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.linearRampToValueAtTime(freq - 5, t + 1.5);
      gain.gain.setValueAtTime(1, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 1.5);
      
      osc.start(t);
      osc.stop(t + 1.5);
    }
    else if (type === 'tom') {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.connect(gain);
      gain.connect(this.masterGain!);
      
      const startFreq = 100 + (variant * 60);
      const endFreq = 20 + (variant * 10);
      osc.frequency.setValueAtTime(startFreq, t);
      osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.6);
      gain.gain.setValueAtTime(1, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
      
      osc.start(t);
      osc.stop(t + 0.6);
    }
    else if (type === 'snare') {
      // Pitch transient + Noise burst
      const osc = this.ctx!.createOscillator();
      const oscGain = this.ctx!.createGain();
      osc.frequency.setValueAtTime(250, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.2);
      oscGain.gain.setValueAtTime(1, t);
      oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
      osc.connect(oscGain);
      oscGain.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.2);

      const bufferSize = this.ctx!.sampleRate * 0.25;
      const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
      
      const noise = this.ctx!.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = this.ctx!.createBiquadFilter();
      const noiseGain = this.ctx!.createGain();
      
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.value = 1500;
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain!);
      
      noiseGain.gain.setValueAtTime(1, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
      
      noise.start(t);
    }
    else if (type === 'rim') {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.connect(gain);
      gain.connect(this.masterGain!);
      
      // High pitch wood block sound
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.05);
      gain.gain.setValueAtTime(1, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
      
      osc.start(t);
      osc.stop(t + 0.05);
    }
    else if (type === 'cowbell') {
      const osc1 = this.ctx!.createOscillator();
      const osc2 = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const filter = this.ctx!.createBiquadFilter();

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);
      
      osc1.type = 'square';
      osc2.type = 'square';
      osc1.frequency.value = 800; // Foundational frequency
      osc2.frequency.value = 540; // Dissonant interval

      filter.type = 'bandpass';
      filter.frequency.value = 1000;
      
      gain.gain.setValueAtTime(1, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      
      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.3);
      osc2.stop(t + 0.3);
    }
    else if (type === 'zap') {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.connect(gain);
      gain.connect(this.masterGain!);
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(2000, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
      
      gain.gain.setValueAtTime(1, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      
      osc.start(t);
      osc.stop(t + 0.1);
    }
    else if (type === 'o-hat' || type === 'hihat') {
      const dur = type === 'o-hat' ? 0.3 : 0.1;
      const bufferSize = this.ctx!.sampleRate * dur;
      const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
      
      const noise = this.ctx!.createBufferSource();
      noise.buffer = buffer;
      const highpass = this.ctx!.createBiquadFilter();
      const gain = this.ctx!.createGain();
      
      highpass.type = 'highpass';
      highpass.frequency.value = 8000;
      
      noise.connect(highpass);
      highpass.connect(gain);
      gain.connect(this.masterGain!);
      
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + dur);
      
      noise.start(t);
    }
    else if (type === 'c-hat') {
      const bufferSize = this.ctx!.sampleRate * 0.05;
      const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
      
      const noise = this.ctx!.createBufferSource();
      noise.buffer = buffer;
      const highpass = this.ctx!.createBiquadFilter();
      const gain = this.ctx!.createGain();
      
      highpass.type = 'highpass';
      highpass.frequency.value = 10000;
      
      noise.connect(highpass);
      highpass.connect(gain);
      gain.connect(this.masterGain!);
      
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
      
      noise.start(t);
    }
    else if (type === 'ride' || type === 'crash') {
      const dur = type === 'crash' ? 1.5 : 0.8;
      const bufferSize = this.ctx!.sampleRate * dur;
      const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
      
      const noise = this.ctx!.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx!.createBiquadFilter();
      const bandpass = this.ctx!.createBiquadFilter();
      const gain = this.ctx!.createGain();
      
      filter.type = 'highpass';
      filter.frequency.value = type === 'ride' ? 6000 : 4000;
      
      const osc = this.ctx!.createOscillator();
      osc.type = 'square';
      osc.frequency.value = type === 'ride' ? 2000 : 800;
      
      const mixedGain = this.ctx!.createGain();
      mixedGain.gain.value = 0.2;
      osc.connect(mixedGain);
      
      noise.connect(filter);
      filter.connect(gain);
      mixedGain.connect(gain);
      gain.connect(this.masterGain!);
      
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + dur);
      
      noise.start(t);
      osc.start(t);
      osc.stop(t + dur);
    }
    else if (type === 'clap') {
      const bufferSize = this.ctx!.sampleRate * 0.3;
      const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
      
      const noise = this.ctx!.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx!.createBiquadFilter();
      const gain = this.ctx!.createGain();
      
      filter.type = 'bandpass';
      filter.frequency.value = 1500;
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);
      
      // simulated clap rhythm
      gain.gain.setValueAtTime(0, t);
      gain.gain.setValueAtTime(1, t + 0.01);
      gain.gain.setValueAtTime(0, t + 0.02);
      gain.gain.setValueAtTime(1, t + 0.03);
      gain.gain.setValueAtTime(0, t + 0.04);
      gain.gain.setValueAtTime(1, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      
      noise.start(t);
    }
  }
}

// Global instance to avoid React strict mode double init issues
export const synthEngine = new SynthEngine();

export function useSynth() {
  const [params, setParamsState] = useState<SynthParams>(defaultParams);
  
  const setParams = (newParams: Partial<SynthParams>) => {
    const updated = { ...params, ...newParams };
    setParamsState(updated);
    synthEngine.updateParams(updated);
  };

  return {
    params,
    setParams,
    noteOn: synthEngine.noteOn.bind(synthEngine),
    noteOff: synthEngine.noteOff.bind(synthEngine),
    playDrum: synthEngine.playDrum.bind(synthEngine),
    setPitch: synthEngine.setPitch.bind(synthEngine),
    setMod: synthEngine.setMod.bind(synthEngine),
    getVisualData: synthEngine.getVisualData.bind(synthEngine),
    startRecording: synthEngine.startRecording.bind(synthEngine),
    stopRecording: synthEngine.stopRecording.bind(synthEngine),
    getActiveCount: () => synthEngine.activeVoices.size
  };
}
