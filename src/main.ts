import './style.css'
import { AudioEngine } from './audio/AudioEngine'
import type { SoundPreset } from './audio/presets'
import {
  getKeyboardVoiceId,
  getPointerVoiceId,
  notes,
  notesByKeyboardKey,
  transposeFrequency,
} from './ui/keyboard'

const soundPresets: Array<{ label: string; preset: SoundPreset }> = [
  { label: 'Classic', preset: 'classic' },
  { label: 'Warm', preset: 'warm' },
  { label: 'Bright', preset: 'bright' },
  { label: 'Bass', preset: 'bass' },
  { label: 'Glass', preset: 'glass' },
  { label: 'Pluck', preset: 'pluck' },
  { label: 'Organ', preset: 'organ' },
  { label: 'Pad', preset: 'pad' },
  { label: 'Reed', preset: 'reed' },
]

const signalBarCount = 24
const signalColors = ['#72d8cf', '#94b8f2', '#d7c56f', '#df8d79', '#b5a4ef']
type VisualEffectKind = 'lightning' | 'wind' | 'fire' | 'water'
type EffectChannel = 'transport' | 'preset' | 'performance' | 'keyboard' | 'modulation'
type EffectOrigin = {
  clientX: number
  clientY: number
}
type PointerSession = {
  button: HTMLButtonElement
  label: string
  voiceId: string
}

const effectProfiles: Record<EffectChannel, { probability: number; kinds: VisualEffectKind[] }> = {
  transport: { probability: 0.58, kinds: ['lightning', 'fire', 'wind'] },
  preset: { probability: 0.32, kinds: ['lightning', 'water', 'wind'] },
  performance: { probability: 0.36, kinds: ['wind', 'water', 'lightning'] },
  keyboard: { probability: 0.14, kinds: ['water', 'fire', 'wind', 'lightning'] },
  modulation: { probability: 0.24, kinds: ['water', 'wind', 'fire'] },
}

const signalBars = Array.from({ length: signalBarCount }, (_, index) => {
  const color = signalColors[index % signalColors.length]

  return `<span style="--i: ${index}; --level: 8%; --glow: 0; --bar-color: ${color}"></span>`
}).join('')
const smoothedSignalLevels = Array.from({ length: signalBarCount }, () => 0)
let activePreset: SoundPreset = 'classic'
let keyboardOctaveShift = 0

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<main class="shell" id="app-shell">
  <section class="synth" aria-labelledby="app-title">
    <div class="effect-layer" id="interaction-effects" aria-hidden="true"></div>

    <header class="synth-header">
      <aside class="header-panel identity-card" aria-hidden="true">
        <p class="panel-label">Build Notes</p>
        <div class="identity-stack">
          <span>17 playable keys</span>
          <span>9 sound presets</span>
          <span>ADSR + filter engine</span>
        </div>
      </aside>

      <div class="brand-lockup">
        <p class="eyebrow"><span>Operation VoltAudio</span></p>
        <h1 id="app-title"><span>VoltSynth</span></h1>
        <div class="brand-meta" aria-hidden="true">
          <span>Browser Synth</span>
          <span>Web Audio API</span>
          <span>Manual build</span>
        </div>
      </div>

      <div class="signal-cluster">
        <div class="signal-display" aria-hidden="true">
          <div class="signal-bars">${signalBars}</div>
        </div>

        <span class="status" id="audio-status" data-state="idle">Audio idle</span>
      </div>
    </header>

    <div class="control-grid">
      <section class="module transport module-live" aria-label="Audio transport">
        <button class="primary" id="start-audio" type="button">Start Audio</button>
        <button class="secondary" id="play-note" type="button" disabled>Preview Note</button>
      </section>

      <section class="module oscillator" aria-label="Oscillator controls">
        <label for="waveform">Waveform</label>
        <select id="waveform">
          <option value="sawtooth">Saw</option>
          <option value="square">Square</option>
          <option value="triangle">Triangle</option>
          <option value="sine">Sine</option>
        </select>
      </section>

      <section class="module output" aria-label="Output controls">
        <label for="output-level">Output</label>
        <input id="output-level" type="range" min="0" max="0.5" step="0.01" value="0.18" />
      </section>
    </div>

    <section class="sound-bank" aria-label="Sound presets">
      ${soundPresets
        .map(
          ({ label, preset }) => `
            <button class="preset ${preset === activePreset ? 'is-selected' : ''}" type="button" data-preset="${preset}">
              <span>${label}</span>
            </button>
          `,
        )
        .join('')}
    </section>

    <section class="performance-bank" aria-label="Performance controls">
      <div class="performance-panel octave-panel">
        <label>Keyboard Octave</label>
        <div class="stepper">
          <button class="step-button" id="octave-down" type="button">-</button>
          <span class="step-display" id="octave-display">0</span>
          <button class="step-button" id="octave-up" type="button">+</button>
        </div>
      </div>

      <div class="performance-panel tone-panel">
        <label for="tone-control">Tone</label>
        <input id="tone-control" type="range" min="0.6" max="1.6" step="0.01" value="1" />
      </div>

      <div class="performance-panel tail-panel">
        <label for="tail-control">Tail</label>
        <input id="tail-control" type="range" min="0.5" max="1.8" step="0.01" value="1" />
      </div>
    </section>

    <div class="drip-rail" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
    </div>

    <div class="keyboard-viewport">
      <section class="keyboard" aria-label="VoltSynth keyboard">
        ${notes
          .map(
            (note) => `
              <button class="key ${note.sharp ? 'is-sharp' : ''}" type="button" data-note="${note.label}" data-frequency="${note.frequency}" data-key="${note.key}" disabled>
                <span class="note-name">${note.label}</span>
                <kbd>${note.key.toUpperCase()}</kbd>
              </button>
            `,
          )
          .join('')}
      </section>
    </div>
  </section>
</main>
`

const engine = new AudioEngine()
const shell = document.querySelector<HTMLElement>('#app-shell')!
const startButton = document.querySelector<HTMLButtonElement>('#start-audio')!
const playButton = document.querySelector<HTMLButtonElement>('#play-note')!
const status = document.querySelector<HTMLSpanElement>('#audio-status')!
const octaveDownButton = document.querySelector<HTMLButtonElement>('#octave-down')!
const octaveUpButton = document.querySelector<HTMLButtonElement>('#octave-up')!
const octaveDisplay = document.querySelector<HTMLSpanElement>('#octave-display')!
const tailControl = document.querySelector<HTMLInputElement>('#tail-control')!
const toneControl = document.querySelector<HTMLInputElement>('#tone-control')!
const waveform = document.querySelector<HTMLSelectElement>('#waveform')!
const outputLevel = document.querySelector<HTMLInputElement>('#output-level')!
const keyButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-frequency]')]
const presetButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-preset]')]
const signalBarElements = [...document.querySelectorAll<HTMLSpanElement>('.signal-bars span')]
const effectLayer = document.querySelector<HTMLDivElement>('#interaction-effects')!
const synthPanel = document.querySelector<HTMLElement>('.synth')!
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
const activeNoteCounts = new Map<string, number>()
const activeComputerKeys = new Set<string>()
const activePointerVoices = new Set<string>()
const activePointerSessions = new Map<number, PointerSession>()
let lastSignalFrame = -34
let lastWaveformValue = waveform.value
let lastOutputValue = outputLevel.value
let lastToneValue = toneControl.value
let lastTailValue = tailControl.value

const setStatus = (label: string, state: 'idle' | 'ready' | 'playing' | 'error') => {
  status.textContent = label
  status.dataset.state = state
}

const syncOutputLevel = () => {
  engine.setMasterLevel(Number(outputLevel.value))
}

const syncToneControl = () => {
  engine.setTone(Number(toneControl.value))
}

const syncTailControl = () => {
  engine.setReleaseScale(Number(tailControl.value))
}

const promptStartAudio = (detail = 'Press Start Audio') => {
  setStatus(detail, 'idle')
}

const releasePointerSession = (pointerId: number) => {
  const session = activePointerSessions.get(pointerId)
  if (!session) return

  activePointerSessions.delete(pointerId)
  activePointerVoices.delete(session.voiceId)

  if (session.button.hasPointerCapture(pointerId)) {
    session.button.releasePointerCapture(pointerId)
  }

  stopNote(session.label, session.voiceId)
}

const clearActiveNotes = () => {
  activeComputerKeys.forEach((keyboardKey) => {
    const note = notesByKeyboardKey.get(keyboardKey)
    if (note) stopNote(note.label, getKeyboardVoiceId(keyboardKey))
  })
  activeComputerKeys.clear()

  ;[...activePointerSessions.keys()].forEach((pointerId) => {
    releasePointerSession(pointerId)
  })
}

const getEffectOrigin = (anchor: HTMLElement, event?: Event): EffectOrigin => {
  if (event instanceof MouseEvent && (event.clientX !== 0 || event.clientY !== 0)) {
    return {
      clientX: event.clientX,
      clientY: event.clientY,
    }
  }

  const rect = anchor.getBoundingClientRect()

  return {
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
  }
}

const appendTimedEffect = (effect: HTMLElement | SVGSVGElement, duration: number) => {
  effectLayer.append(effect)
  window.setTimeout(() => effect.remove(), duration)
}

const createLightningPolyline = (width: number, height: number, startX: number) => {
  let x = startX
  let y = 6
  const points = [`${x},${y}`]

  while (y < height - 18) {
    x += (Math.random() - 0.5) * 20
    y += 18 + Math.random() * 26
    points.push(`${Math.max(8, Math.min(width - 8, x))},${Math.min(height - 8, y)}`)
  }

  return points.join(' ')
}

const emitLightning = (clientX: number, clientY: number) => {
  const rect = synthPanel.getBoundingClientRect()
  const x = clientX - rect.left
  const y = clientY - rect.top
  const width = 132
  const height = 240
  const left = Math.max(0, Math.min(rect.width - width, x - width / 2))
  const top = Math.max(0, Math.min(rect.height - height, y - height * 0.34))
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const hue = ['var(--electric)', 'var(--sky)', 'var(--violet)'][Math.floor(Math.random() * 3)]

  svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
  svg.setAttribute('class', 'lightning-strike')
  svg.style.left = `${left}px`
  svg.style.top = `${top}px`
  svg.style.setProperty('--bolt-color', hue)
  svg.innerHTML = `
    <polyline class="bolt branch" points="${createLightningPolyline(width, height * 0.72, width * 0.34)}" />
    <polyline class="bolt main" points="${createLightningPolyline(width, height, width * 0.54)}" />
    <polyline class="bolt branch" points="${createLightningPolyline(width, height * 0.78, width * 0.72)}" />
  `

  appendTimedEffect(svg, 520)
}

const emitWind = (clientX: number, clientY: number) => {
  const rect = synthPanel.getBoundingClientRect()
  const x = clientX - rect.left
  const y = clientY - rect.top
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const hue = ['var(--sky)', 'var(--electric)', 'var(--paper)'][Math.floor(Math.random() * 3)]

  svg.setAttribute('viewBox', '0 0 192 108')
  svg.setAttribute('class', 'effect-wind')
  svg.style.left = `${Math.max(18, Math.min(rect.width - 174, x - 86))}px`
  svg.style.top = `${Math.max(18, Math.min(rect.height - 98, y - 52))}px`
  svg.style.setProperty('--wind-color', hue)
  svg.innerHTML = `
    <path class="wind-line line-a" d="M 10 62 C 38 38, 68 34, 98 44 S 146 76, 182 42" />
    <path class="wind-line line-b" d="M 22 52 C 58 22, 92 22, 120 36 S 158 58, 176 32" />
    <path class="wind-line line-c" d="M 18 80 C 54 60, 84 62, 120 72 S 154 92, 182 68" />
  `

  appendTimedEffect(svg, 760)
}

const emitFire = (clientX: number, clientY: number) => {
  const rect = synthPanel.getBoundingClientRect()
  const x = clientX - rect.left
  const y = clientY - rect.top
  const effect = document.createElement('div')

  effect.className = 'effect-fire'
  effect.style.left = `${x}px`
  effect.style.top = `${y}px`
  effect.innerHTML = `
    <span class="flame flame-a"></span>
    <span class="flame flame-b"></span>
    <span class="flame flame-c"></span>
    <span class="spark spark-a"></span>
    <span class="spark spark-b"></span>
    <span class="spark spark-c"></span>
  `

  appendTimedEffect(effect, 820)
}

const emitWater = (clientX: number, clientY: number) => {
  const rect = synthPanel.getBoundingClientRect()
  const x = clientX - rect.left
  const y = clientY - rect.top
  const effect = document.createElement('div')

  effect.className = 'effect-water'
  effect.style.left = `${x}px`
  effect.style.top = `${y}px`
  effect.innerHTML = `
    <span class="ring ring-a"></span>
    <span class="ring ring-b"></span>
    <span class="drop drop-a"></span>
    <span class="drop drop-b"></span>
    <span class="drop drop-c"></span>
  `

  appendTimedEffect(effect, 920)
}

const emitEffect = (kind: VisualEffectKind, origin: EffectOrigin) => {
  switch (kind) {
    case 'wind':
      emitWind(origin.clientX, origin.clientY)
      break
    case 'fire':
      emitFire(origin.clientX, origin.clientY)
      break
    case 'water':
      emitWater(origin.clientX, origin.clientY)
      break
    default:
      emitLightning(origin.clientX, origin.clientY)
      break
  }
}

const maybeEmitInteractionEffect = (
  anchor: HTMLElement,
  channel: EffectChannel,
  event?: Event,
  overrides?: Partial<{ kinds: VisualEffectKind[]; probability: number }>,
) => {
  if (prefersReducedMotion.matches) return

  const profile = effectProfiles[channel]
  const probability = overrides?.probability ?? profile.probability

  if (Math.random() > probability) return

  const kinds = overrides?.kinds ?? profile.kinds
  const kind = kinds[Math.floor(Math.random() * kinds.length)]

  emitEffect(kind, getEffectOrigin(anchor, event))
}

const runEffectfulAction = async ({
  action,
  anchor,
  channel,
  effect,
  event,
}: {
  action: () => boolean | Promise<boolean>
  anchor: HTMLElement
  channel: EffectChannel
  effect?: Partial<{ kinds: VisualEffectKind[]; probability: number }>
  event?: Event
}) => {
  if (anchor instanceof HTMLButtonElement && anchor.disabled) return false

  try {
    const applied = await action()

    if (!applied) return false

    maybeEmitInteractionEffect(anchor, channel, event, effect)
    return true
  } catch (error) {
    handleAudioError(error)
    return false
  }
}

const renderSignalDisplay = (timestamp = 0) => {
  if (document.hidden) {
    window.requestAnimationFrame(renderSignalDisplay)
    return
  }

  if (timestamp - lastSignalFrame < 34) {
    window.requestAnimationFrame(renderSignalDisplay)
    return
  }

  lastSignalFrame = timestamp

  const levels = engine.getFrequencyBands(signalBarElements.length)
  const hasSignal = levels.some((level) => level > 0.018)

  signalBarElements.forEach((bar, index) => {
    const idleLevel = 0.045 + (index % 5) * 0.003
    const targetLevel = hasSignal ? Math.max(levels[index], idleLevel) : idleLevel
    const previousLevel = smoothedSignalLevels[index]
    const smoothing = targetLevel > previousLevel ? 0.32 : 0.11
    const level = previousLevel + (targetLevel - previousLevel) * smoothing
    const height = Math.round((10 + level * 72) * 10) / 10
    const glow = Math.round(Math.min(level * 0.78, 0.74) * 100) / 100
    const glowSize = Math.round((8 + glow * 18) * 10) / 10
    const opacity = Math.round((0.54 + glow * 0.34) * 100) / 100

    smoothedSignalLevels[index] = level

    bar.style.setProperty('--level', `${height}%`)
    bar.style.setProperty('--glow', `${glow}`)
    bar.style.setProperty('--glow-size', `${glowSize}px`)
    bar.style.setProperty('--bar-opacity', `${opacity}`)
  })

  window.requestAnimationFrame(renderSignalDisplay)
}

const flashKey = (label: string) => {
  const activeKey = keyButtons.find((button) => button.dataset.note === label)
  if (!activeKey) return

  activeKey.classList.add('is-hit')
  window.setTimeout(() => activeKey.classList.remove('is-hit'), 240)
}

const updateOctaveDisplay = () => {
  const prefix = keyboardOctaveShift > 0 ? '+' : ''
  octaveDisplay.textContent = `${prefix}${keyboardOctaveShift}`
  octaveDownButton.disabled = keyboardOctaveShift <= -1
  octaveUpButton.disabled = keyboardOctaveShift >= 1
}

const enableInstrument = async () => {
  if (engine.isReady && startButton.disabled) return false

  await engine.start()
  syncOutputLevel()
  syncToneControl()
  syncTailControl()

  startButton.textContent = 'Audio Ready'
  startButton.disabled = true
  playButton.disabled = false
  presetButtons.forEach((button) => {
    button.disabled = false
  })
  octaveDownButton.disabled = false
  octaveUpButton.disabled = false
  toneControl.disabled = false
  tailControl.disabled = false
  keyButtons.forEach((button) => {
    button.disabled = false
  })
  setStatus('Audio ready', 'ready')
  return true
}

const handleAudioError = (error: unknown) => {
  console.warn('VoltSynth audio could not start:', error)
  setStatus('Audio blocked', 'error')
}

const setPreset = (preset: SoundPreset) => {
  const changed = activePreset !== preset
  activePreset = preset
  presetButtons.forEach((button) => {
    button.classList.toggle('is-selected', button.dataset.preset === preset)
  })
  setStatus(`${preset} sound`, engine.isReady ? 'ready' : 'idle')
  return changed
}

const setKeyActive = (label: string, isActive: boolean) => {
  const activeKey = keyButtons.find((button) => button.dataset.note === label)

  activeKey?.classList.toggle('is-playing', isActive)
  if (isActive) flashKey(label)
}

const activateNoteVisual = (label: string) => {
  const nextCount = (activeNoteCounts.get(label) ?? 0) + 1

  activeNoteCounts.set(label, nextCount)
  setKeyActive(label, true)
}

const deactivateNoteVisual = (label: string) => {
  const nextCount = Math.max((activeNoteCounts.get(label) ?? 1) - 1, 0)

  if (nextCount === 0) {
    activeNoteCounts.delete(label)
    setKeyActive(label, false)
    return
  }

  activeNoteCounts.set(label, nextCount)
}

const startNote = async (frequency: number, label: string, voiceId: string) => {
  try {
    if (!engine.isReady) {
      promptStartAudio(`Press Start Audio for ${label}`)
      return false
    }

    engine.startVoice({
      frequency,
      preset: activePreset,
      voiceId,
      waveform: waveform.value as OscillatorType,
    })

    activateNoteVisual(label)
    setStatus(`${label} playing`, 'playing')
    return true
  } catch (error) {
    handleAudioError(error)
    return false
  }
}

const stopNote = (label: string, voiceId: string) => {
  engine.stopVoice(voiceId)
  deactivateNoteVisual(label)
  setStatus(engine.isReady ? 'Audio ready' : 'Audio idle', engine.isReady ? 'ready' : 'idle')
}

const playPreviewNote = async (frequency: number, label: string) => {
  try {
    if (!engine.isReady) {
      promptStartAudio('Press Start Audio')
      return false
    }

    engine.playNote({
      duration: 0.68,
      frequency,
      preset: activePreset,
      waveform: waveform.value as OscillatorType,
    })

    flashKey(label)
    setStatus(`${label} preview`, 'playing')
    window.setTimeout(() => {
      setStatus(engine.isReady ? 'Audio ready' : 'Audio idle', engine.isReady ? 'ready' : 'idle')
    }, 560)
    return true
  } catch (error) {
    handleAudioError(error)
    return false
  }
}

startButton.addEventListener('click', (event) => {
  void runEffectfulAction({
    action: enableInstrument,
    anchor: startButton,
    channel: 'transport',
    effect: { kinds: ['lightning', 'fire', 'wind'], probability: 0.58 },
    event,
  })
})

playButton.addEventListener('click', (event) => {
  void runEffectfulAction({
    action: () => playPreviewNote(261.63, 'C4'),
    anchor: playButton,
    channel: 'transport',
    effect: { kinds: ['fire', 'lightning', 'wind'], probability: 0.42 },
    event,
  })
})

outputLevel.addEventListener('input', syncOutputLevel)
outputLevel.addEventListener('change', (event) => {
  if (outputLevel.value === lastOutputValue) return

  lastOutputValue = outputLevel.value
  setStatus(`Output ${Math.round((Number(outputLevel.value) / 0.5) * 100)}%`, engine.isReady ? 'ready' : 'idle')
  maybeEmitInteractionEffect(outputLevel, 'modulation', event, {
    kinds: ['water', 'wind'],
    probability: 0.18,
  })
})

toneControl.addEventListener('input', syncToneControl)
toneControl.addEventListener('change', (event) => {
  if (toneControl.value === lastToneValue) return

  lastToneValue = toneControl.value
  setStatus(`Tone ${Number(toneControl.value).toFixed(2)}x`, engine.isReady ? 'ready' : 'idle')
  maybeEmitInteractionEffect(toneControl, 'modulation', event, {
    kinds: ['wind', 'fire'],
    probability: 0.22,
  })
})

tailControl.addEventListener('input', syncTailControl)
tailControl.addEventListener('change', (event) => {
  if (tailControl.value === lastTailValue) return

  lastTailValue = tailControl.value
  setStatus(`Tail ${Number(tailControl.value).toFixed(2)}x`, engine.isReady ? 'ready' : 'idle')
  maybeEmitInteractionEffect(tailControl, 'modulation', event, {
    kinds: ['water', 'wind', 'fire'],
    probability: 0.24,
  })
})

waveform.addEventListener('change', (event) => {
  if (waveform.value === lastWaveformValue) return

  lastWaveformValue = waveform.value
  const label = waveform.selectedOptions[0]?.textContent ?? waveform.value

  setStatus(`${label} waveform`, engine.isReady ? 'ready' : 'idle')
  maybeEmitInteractionEffect(waveform, 'modulation', event, {
    kinds: ['wind', 'water'],
    probability: 0.26,
  })
})

octaveDownButton.addEventListener('click', (event) => {
  void runEffectfulAction({
    action: () => {
      const nextShift = Math.max(-1, keyboardOctaveShift - 1)

      if (nextShift === keyboardOctaveShift) return false

      keyboardOctaveShift = nextShift
      updateOctaveDisplay()
      setStatus(`Keyboard ${keyboardOctaveShift > 0 ? '+' : ''}${keyboardOctaveShift} oct`, 'ready')
      return true
    },
    anchor: octaveDownButton,
    channel: 'performance',
    effect: { kinds: ['wind', 'water', 'lightning'], probability: 0.36 },
    event,
  })
})

octaveUpButton.addEventListener('click', (event) => {
  void runEffectfulAction({
    action: () => {
      const nextShift = Math.min(1, keyboardOctaveShift + 1)

      if (nextShift === keyboardOctaveShift) return false

      keyboardOctaveShift = nextShift
      updateOctaveDisplay()
      setStatus(`Keyboard ${keyboardOctaveShift > 0 ? '+' : ''}${keyboardOctaveShift} oct`, 'ready')
      return true
    },
    anchor: octaveUpButton,
    channel: 'performance',
    effect: { kinds: ['wind', 'water', 'lightning'], probability: 0.36 },
    event,
  })
})

presetButtons.forEach((button) => {
  button.disabled = false
  button.addEventListener('click', (event) => {
    void runEffectfulAction({
      action: async () => {
        const preset = button.dataset.preset as SoundPreset
        const changed = setPreset(preset)
        const previewed = await playPreviewNote(329.63, 'E4')

        return changed || previewed
      },
      anchor: button,
      channel: 'preset',
      effect: { kinds: ['lightning', 'water', 'wind'], probability: 0.28 },
      event,
    })
  })
})

keyButtons.forEach((button) => {
  button.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return

    const frequency = Number(button.dataset.frequency)
    const label = button.dataset.note ?? 'Note'
    const voiceId = getPointerVoiceId(label)

    if (button.disabled || activePointerVoices.has(voiceId)) return

    activePointerVoices.add(voiceId)
    activePointerSessions.set(event.pointerId, {
      button,
      label,
      voiceId,
    })
    button.setPointerCapture(event.pointerId)
    void startNote(frequency, label, voiceId).then((didStart) => {
      if (!didStart) {
        releasePointerSession(event.pointerId)
        return
      }

      if (didStart) {
        maybeEmitInteractionEffect(button, 'keyboard', event, {
          kinds: ['water', 'fire', 'wind', 'lightning'],
          probability: 0.12,
        })
      }
    })
  })

  button.addEventListener('pointerup', (event) => {
    releasePointerSession(event.pointerId)
  })

  button.addEventListener('pointercancel', (event) => {
    releasePointerSession(event.pointerId)
  })

  button.addEventListener('lostpointercapture', (event) => {
    releasePointerSession(event.pointerId)
  })
})

window.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return

  const keyboardKey = event.key.toLowerCase()
  const note = notesByKeyboardKey.get(keyboardKey)

  if (!note || activeComputerKeys.has(keyboardKey)) return

  event.preventDefault()
  activeComputerKeys.add(keyboardKey)
  void startNote(
    transposeFrequency(note.frequency, keyboardOctaveShift),
    note.label,
    getKeyboardVoiceId(keyboardKey),
  ).then(
    (didStart) => {
      if (!didStart) activeComputerKeys.delete(keyboardKey)
    },
  )
})

window.addEventListener('keyup', (event) => {
  const keyboardKey = event.key.toLowerCase()
  const note = notesByKeyboardKey.get(keyboardKey)

  if (!note) return

  event.preventDefault()
  activeComputerKeys.delete(keyboardKey)
  stopNote(note.label, getKeyboardVoiceId(keyboardKey))
})

window.addEventListener('blur', () => {
  clearActiveNotes()
})

document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearActiveNotes()
})

const stageLandingSequence = () => {
  window.requestAnimationFrame(() => {
    shell.classList.add('is-loaded')
    window.setTimeout(() => shell.classList.add('is-built'), prefersReducedMotion.matches ? 0 : 760)
  })
}

updateOctaveDisplay()
syncToneControl()
syncTailControl()
stageLandingSequence()
window.requestAnimationFrame(renderSignalDisplay)
