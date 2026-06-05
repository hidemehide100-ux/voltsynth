import { presets, type SoundPreset } from './presets'
import { Voice } from './Voice'

export type { SoundPreset } from './presets'

export type PlayNoteOptions = {
  frequency: number
  duration?: number
  preset?: SoundPreset
  voiceId?: string
  waveform?: OscillatorType
}

type AudioContextConstructor = typeof AudioContext

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export class AudioEngine {
  private readonly activeVoices = new Map<string, Voice>()
  private analyser: AnalyserNode | null = null
  private context: AudioContext | null = null
  private frequencyData: Uint8Array | null = null
  private masterGain: GainNode | null = null
  private masterLevel = 0.18
  private releaseScale = 1
  private tone = 1

  get isReady() {
    return this.context?.state === 'running'
  }

  async start() {
    if (!this.context) {
      const AudioContextClass =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext

      if (!AudioContextClass) {
        throw new Error('This browser does not support Web Audio.')
      }

      this.context = new AudioContextClass()
      this.masterGain = this.context.createGain()
      this.analyser = this.context.createAnalyser()
      this.analyser.fftSize = 2048
      this.analyser.minDecibels = -92
      this.analyser.maxDecibels = -18
      this.analyser.smoothingTimeConstant = 0.78
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount)

      this.masterGain.gain.setValueAtTime(this.masterLevel, this.context.currentTime)
      this.masterGain.connect(this.analyser)
      this.analyser.connect(this.context.destination)
    }

    if (this.context.state === 'suspended') {
      await Promise.race([
        this.context.resume(),
        new Promise<void>((_, reject) => {
          window.setTimeout(() => reject(new Error('Audio startup timed out.')), 1000)
        }),
      ])
    }

    if (this.context.state !== 'running') {
      throw new Error('Audio is blocked by the browser.')
    }
  }

  setMasterLevel(level: number) {
    this.masterLevel = clamp(level, 0, 1)

    if (!this.context || !this.masterGain) return

    this.masterGain.gain.setTargetAtTime(this.masterLevel, this.context.currentTime, 0.01)
  }

  setReleaseScale(scale: number) {
    this.releaseScale = clamp(scale, 0.45, 2.2)
  }

  setTone(amount: number) {
    this.tone = clamp(amount, 0.5, 1.8)

    if (!this.context) return

    this.activeVoices.forEach((voice) => {
      voice.updateTone(this.tone, this.context!.currentTime)
    })
  }

  getFrequencyBands(count: number) {
    if (!this.context || !this.analyser || !this.frequencyData || count <= 0) {
      return Array.from({ length: Math.max(count, 0) }, () => 0)
    }

    const frequencyData = this.frequencyData as Uint8Array<ArrayBuffer>

    this.analyser.getByteFrequencyData(frequencyData)

    const nyquist = this.context.sampleRate / 2
    const minFrequency = 70
    const maxFrequency = 4200

    return Array.from({ length: count }, (_, index) => {
      const lowRatio = index / count
      const highRatio = (index + 1) / count
      const lowFrequency = minFrequency * (maxFrequency / minFrequency) ** lowRatio
      const highFrequency = minFrequency * (maxFrequency / minFrequency) ** highRatio
      const startBin = Math.max(0, Math.floor((lowFrequency / nyquist) * frequencyData.length))
      const endBin = Math.max(
        startBin + 1,
        Math.ceil((highFrequency / nyquist) * frequencyData.length),
      )
      let total = 0
      let peak = 0

      for (let bin = startBin; bin < endBin && bin < frequencyData.length; bin += 1) {
        const value = frequencyData[bin]

        total += value
        peak = Math.max(peak, value)
      }

      const average = total / Math.max(endBin - startBin, 1)
      const normalizedPeak = (peak / 255) ** 0.72
      const normalizedAverage = (average / 255) ** 0.62

      return Math.min(1, Math.max(normalizedPeak, normalizedAverage * 0.72))
    })
  }

  startVoice({
    frequency,
    preset = 'classic',
    voiceId = String(frequency),
    waveform = 'sawtooth',
  }: PlayNoteOptions) {
    if (!this.context || !this.masterGain) {
      throw new Error('Audio has not been started yet.')
    }

    this.stopVoice(voiceId)

    const voice = new Voice({
      config: presets[preset],
      context: this.context,
      destination: this.masterGain,
      frequency,
      tone: this.tone,
      waveform,
    })

    voice.start(this.context.currentTime)
    this.activeVoices.set(voiceId, voice)

    return voice
  }

  stopVoice(voiceId: string) {
    const voice = this.activeVoices.get(voiceId)
    if (!this.context || !voice) return

    voice.release(this.releaseScale, this.context.currentTime)
    this.activeVoices.delete(voiceId)
  }

  stopAllVoices() {
    if (!this.context) return

    ;[...this.activeVoices.entries()].forEach(([voiceId, voice]) => {
      voice.release(this.releaseScale, this.context!.currentTime)
      this.activeVoices.delete(voiceId)
    })
  }

  playNote({ duration = 0.72, voiceId, ...options }: PlayNoteOptions) {
    const noteVoiceId = voiceId ?? `preview-${options.frequency}-${performance.now()}`

    this.startVoice({ ...options, voiceId: noteVoiceId })
    window.setTimeout(() => this.stopVoice(noteVoiceId), duration * 1000)
  }
}
