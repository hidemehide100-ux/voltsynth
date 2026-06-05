import type { EnvelopeShape } from './presets'

export const MIN_ENVELOPE_GAIN = 0.0001

export const applyAttackDecayEnvelope = (
  gain: AudioParam,
  peakGain: number,
  envelope: EnvelopeShape,
  now: number,
) => {
  const safePeakGain = Math.max(peakGain, MIN_ENVELOPE_GAIN * 2)
  const sustainGain = Math.max(MIN_ENVELOPE_GAIN, safePeakGain * envelope.sustain)
  const attackEnd = now + Math.max(envelope.attack, 0)
  const decayEnd = attackEnd + Math.max(envelope.decay, 0)

  gain.cancelScheduledValues(now)
  gain.setValueAtTime(MIN_ENVELOPE_GAIN, now)

  if (envelope.attack > 0) {
    gain.linearRampToValueAtTime(safePeakGain, attackEnd)
  } else {
    gain.setValueAtTime(safePeakGain, now)
  }

  if (envelope.decay > 0) {
    gain.linearRampToValueAtTime(sustainGain, decayEnd)
  } else {
    gain.setValueAtTime(sustainGain, attackEnd)
  }

  return {
    attackEnd,
    decayEnd,
    peakGain: safePeakGain,
    sustainGain,
  }
}

export const applyReleaseEnvelope = (gain: AudioParam, release: number, now: number) => {
  const safeRelease = Math.max(release, 0.015)
  const currentGain = Math.max(gain.value, MIN_ENVELOPE_GAIN)

  gain.cancelScheduledValues(now)
  gain.setValueAtTime(currentGain, now)
  gain.linearRampToValueAtTime(MIN_ENVELOPE_GAIN, now + safeRelease)

  return safeRelease
}
