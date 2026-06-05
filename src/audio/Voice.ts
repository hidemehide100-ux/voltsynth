import { applyAttackDecayEnvelope, applyReleaseEnvelope } from './Envelope'
import type { VoiceConfig } from './presets'

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

type VoiceOptions = {
  config: VoiceConfig
  context: AudioContext
  destination: AudioNode
  frequency: number
  tone: number
  waveform: OscillatorType
}

export class Voice {
  private readonly context: AudioContext
  private readonly destination: AudioNode
  private readonly envelopeNode: GainNode
  private readonly filterNode: BiquadFilterNode
  private readonly layerGains: GainNode[] = []
  private readonly oscillators: OscillatorNode[] = []
  private readonly config: VoiceConfig
  private readonly filterBaseFrequency: number
  private releaseTimeout: number | null = null
  private released = false
  private started = false

  constructor({ config, context, destination, frequency, tone, waveform }: VoiceOptions) {
    this.config = config
    this.context = context
    this.destination = destination
    this.filterBaseFrequency = config.filterFrequency

    this.envelopeNode = this.context.createGain()
    this.filterNode = this.context.createBiquadFilter()

    this.filterNode.type = config.filterType
    this.filterNode.Q.setValueAtTime(config.filterQ, this.context.currentTime)

    this.filterNode.connect(this.envelopeNode)
    this.envelopeNode.connect(this.destination)

    config.oscillatorMix.forEach((layer) => {
      const oscillator = this.context.createOscillator()
      const layerGain = this.context.createGain()
      const multiplier = 2 ** (layer.octave ?? 0)

      oscillator.type = layer.waveform ?? waveform
      oscillator.frequency.setValueAtTime(frequency * multiplier, this.context.currentTime)
      oscillator.detune.setValueAtTime(layer.detune ?? 0, this.context.currentTime)

      layerGain.gain.setValueAtTime(layer.gain, this.context.currentTime)
      oscillator.connect(layerGain)
      layerGain.connect(this.filterNode)

      this.oscillators.push(oscillator)
      this.layerGains.push(layerGain)
    })

    this.updateTone(tone, this.context.currentTime)
  }

  start(now = this.context.currentTime) {
    if (this.started) return

    this.started = true
    applyAttackDecayEnvelope(this.envelopeNode.gain, this.config.peakGain, this.config.envelope, now)
    this.oscillators.forEach((oscillator) => oscillator.start(now))
  }

  updateTone(tone: number, now = this.context.currentTime) {
    const targetFrequency = clamp(this.filterBaseFrequency * tone, 80, 16_000)

    this.filterNode.frequency.cancelScheduledValues(now)
    this.filterNode.frequency.setTargetAtTime(targetFrequency, now, 0.03)
  }

  release(releaseScale: number, now = this.context.currentTime) {
    if (this.released) return 0

    this.released = true

    const releaseTime = applyReleaseEnvelope(
      this.envelopeNode.gain,
      this.config.envelope.release * releaseScale,
      now,
    )
    const stopAt = now + releaseTime + 0.05

    this.oscillators.forEach((oscillator, index) => {
      const layerGain = this.layerGains[index]

      oscillator.stop(stopAt)
      oscillator.onended = () => {
        oscillator.disconnect()
        layerGain.disconnect()
      }
    })

    this.releaseTimeout = window.setTimeout(() => {
      this.disconnect()
    }, Math.ceil((releaseTime + 0.08) * 1000))

    return releaseTime
  }

  private disconnect() {
    if (this.releaseTimeout !== null) {
      window.clearTimeout(this.releaseTimeout)
      this.releaseTimeout = null
    }

    this.filterNode.disconnect()
    this.envelopeNode.disconnect()
  }
}
