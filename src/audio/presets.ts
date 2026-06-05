export type SoundPreset =
  | 'classic'
  | 'warm'
  | 'bright'
  | 'bass'
  | 'glass'
  | 'pluck'
  | 'organ'
  | 'pad'
  | 'reed'

export type EnvelopeShape = {
  attack: number
  decay: number
  sustain: number
  release: number
}

export type OscillatorLayer = {
  detune?: number
  gain: number
  octave?: number
  waveform?: OscillatorType
}

export type VoiceConfig = {
  envelope: EnvelopeShape
  filterFrequency: number
  filterQ: number
  filterType: BiquadFilterType
  oscillatorMix: OscillatorLayer[]
  peakGain: number
}

export const presets: Record<SoundPreset, VoiceConfig> = {
  classic: {
    envelope: {
      attack: 0.022,
      decay: 0.16,
      sustain: 0.68,
      release: 0.42,
    },
    filterFrequency: 2200,
    filterQ: 0.65,
    filterType: 'lowpass',
    oscillatorMix: [{ gain: 1 }],
    peakGain: 0.34,
  },
  warm: {
    envelope: {
      attack: 0.045,
      decay: 0.28,
      sustain: 0.74,
      release: 0.68,
    },
    filterFrequency: 1250,
    filterQ: 0.9,
    filterType: 'lowpass',
    oscillatorMix: [
      { detune: -6, gain: 0.54, waveform: 'sawtooth' },
      { detune: 7, gain: 0.38, waveform: 'triangle' },
    ],
    peakGain: 0.32,
  },
  bright: {
    envelope: {
      attack: 0.012,
      decay: 0.14,
      sustain: 0.44,
      release: 0.34,
    },
    filterFrequency: 4200,
    filterQ: 0.45,
    filterType: 'highpass',
    oscillatorMix: [
      { gain: 0.74, waveform: 'sawtooth' },
      { detune: 12, gain: 0.24, waveform: 'square' },
    ],
    peakGain: 0.27,
  },
  bass: {
    envelope: {
      attack: 0.018,
      decay: 0.18,
      sustain: 0.82,
      release: 0.56,
    },
    filterFrequency: 720,
    filterQ: 1.2,
    filterType: 'lowpass',
    oscillatorMix: [
      { gain: 0.72, octave: -1, waveform: 'square' },
      { gain: 0.32, waveform: 'triangle' },
    ],
    peakGain: 0.4,
  },
  glass: {
    envelope: {
      attack: 0.016,
      decay: 0.42,
      sustain: 0.38,
      release: 1.05,
    },
    filterFrequency: 3600,
    filterQ: 1.45,
    filterType: 'bandpass',
    oscillatorMix: [
      { gain: 0.58, waveform: 'sine' },
      { gain: 0.22, octave: 1, waveform: 'triangle' },
    ],
    peakGain: 0.23,
  },
  pluck: {
    envelope: {
      attack: 0.005,
      decay: 0.09,
      sustain: 0.18,
      release: 0.24,
    },
    filterFrequency: 2900,
    filterQ: 1.7,
    filterType: 'lowpass',
    oscillatorMix: [
      { gain: 0.62, waveform: 'triangle' },
      { detune: -10, gain: 0.24, waveform: 'sawtooth' },
    ],
    peakGain: 0.38,
  },
  organ: {
    envelope: {
      attack: 0.018,
      decay: 0.14,
      sustain: 0.92,
      release: 0.48,
    },
    filterFrequency: 1850,
    filterQ: 0.72,
    filterType: 'lowpass',
    oscillatorMix: [
      { gain: 0.5, waveform: 'square' },
      { gain: 0.22, octave: 1, waveform: 'sine' },
      { gain: 0.18, octave: -1, waveform: 'triangle' },
    ],
    peakGain: 0.28,
  },
  pad: {
    envelope: {
      attack: 0.085,
      decay: 0.44,
      sustain: 0.7,
      release: 1.4,
    },
    filterFrequency: 1480,
    filterQ: 0.8,
    filterType: 'lowpass',
    oscillatorMix: [
      { detune: -8, gain: 0.32, waveform: 'sawtooth' },
      { detune: 9, gain: 0.3, waveform: 'sine' },
      { gain: 0.18, octave: 1, waveform: 'triangle' },
    ],
    peakGain: 0.22,
  },
  reed: {
    envelope: {
      attack: 0.015,
      decay: 0.18,
      sustain: 0.6,
      release: 0.52,
    },
    filterFrequency: 1980,
    filterQ: 1.05,
    filterType: 'bandpass',
    oscillatorMix: [
      { gain: 0.56, waveform: 'triangle' },
      { detune: 4, gain: 0.18, waveform: 'square' },
      { octave: -1, gain: 0.16, waveform: 'sine' },
    ],
    peakGain: 0.3,
  },
}
