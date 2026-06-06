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
const signalColors = ['#00a896', '#00a896', '#00a896', '#ff5722', '#ff4500', '#d32f2f']
type PointerSession = {
  button: HTMLButtonElement
  label: string
  voiceId: string
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
    <header class="synth-header">
      <aside class="header-panel identity-card" aria-hidden="true">
        <p class="panel-label">Engine</p>
        <div class="identity-stack">
          <span>17 key range</span>
          <span>Poly voices</span>
          <span>ADSR filter path</span>
        </div>
      </aside>

      <div class="brand-lockup">
        <p class="eyebrow"><span>Operation VoltAudio</span></p>
        <h1 id="app-title"><span>VoltSynth</span></h1>
        <div class="brand-meta" aria-hidden="true">
          <span>Polyphonic</span>
          <span>Subtractive</span>
          <span>Web Audio</span>
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
        <span class="module-title">Transport</span>
        <div class="transport-actions">
          <button class="primary" id="start-audio" type="button">Start Audio</button>
          <button class="secondary" id="play-note" type="button" disabled>Preview Note</button>
        </div>
      </section>

      <section class="module oscillator" aria-label="Oscillator controls">
        <span class="module-title">Oscillator</span>
        <label for="waveform">Waveform</label>
        <select id="waveform">
          <option value="sawtooth">Saw</option>
          <option value="square">Square</option>
          <option value="triangle">Triangle</option>
          <option value="sine">Sine</option>
        </select>
      </section>

      <section class="module output" aria-label="Output controls">
        <span class="module-title">Master</span>
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
        <label for="tone-control">Filter Tone</label>
        <input id="tone-control" type="range" min="0.6" max="1.6" step="0.01" value="1" />
      </div>

      <div class="performance-panel tail-panel">
        <label for="tail-control">Release Tail</label>
        <input id="tail-control" type="range" min="0.5" max="1.8" step="0.01" value="1" />
      </div>

      <div class="performance-panel adsr-panel">
        <label for="attack-control">Attack</label>
        <input id="attack-control" type="range" min="0.005" max="0.4" step="0.005" value="0.022" />
      </div>

      <div class="performance-panel adsr-panel">
        <label for="decay-control">Decay</label>
        <input id="decay-control" type="range" min="0.01" max="0.8" step="0.01" value="0.16" />
      </div>

      <div class="performance-panel adsr-panel">
        <label for="sustain-control">Sustain</label>
        <input id="sustain-control" type="range" min="0.05" max="1" step="0.01" value="0.68" />
      </div>

      <div class="performance-panel adsr-panel">
        <label for="release-control">Release</label>
        <input id="release-control" type="range" min="0.03" max="1.8" step="0.01" value="0.42" />
      </div>
    </section>

    <div class="keyboard-viewport">
      <div class="keyboard-header" aria-hidden="true">
        <span>Piano Keyboard</span>
        <small>Mouse + computer key input</small>
      </div>
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
const attackControl = document.querySelector<HTMLInputElement>('#attack-control')!
const decayControl = document.querySelector<HTMLInputElement>('#decay-control')!
const sustainControl = document.querySelector<HTMLInputElement>('#sustain-control')!
const releaseControl = document.querySelector<HTMLInputElement>('#release-control')!
const toneControl = document.querySelector<HTMLInputElement>('#tone-control')!
const waveform = document.querySelector<HTMLSelectElement>('#waveform')!
const outputLevel = document.querySelector<HTMLInputElement>('#output-level')!
const keyButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-frequency]')]
const presetButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-preset]')]
const signalBarElements = [...document.querySelectorAll<HTMLSpanElement>('.signal-bars span')]
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

const envelopeControls = [attackControl, decayControl, sustainControl, releaseControl]

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

const syncEnvelopeControls = () => {
  engine.setEnvelopeControl({
    attack: Number(attackControl.value),
    decay: Number(decayControl.value),
    sustain: Number(sustainControl.value),
    release: Number(releaseControl.value),
  })
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

const runAction = async (action: () => boolean | Promise<boolean>, anchor?: HTMLElement) => {
  if (anchor instanceof HTMLButtonElement && anchor.disabled) return false

  try {
    return await action()
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
  syncEnvelopeControls()

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
  envelopeControls.forEach((control) => {
    control.disabled = false
  })
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

startButton.addEventListener('click', () => {
  void runAction(enableInstrument, startButton)
})

playButton.addEventListener('click', () => {
  void runAction(() => playPreviewNote(261.63, 'C4'), playButton)
})

outputLevel.addEventListener('input', syncOutputLevel)
outputLevel.addEventListener('change', () => {
  if (outputLevel.value === lastOutputValue) return

  lastOutputValue = outputLevel.value
  setStatus(`Output ${Math.round((Number(outputLevel.value) / 0.5) * 100)}%`, engine.isReady ? 'ready' : 'idle')
})

toneControl.addEventListener('input', syncToneControl)
toneControl.addEventListener('change', () => {
  if (toneControl.value === lastToneValue) return

  lastToneValue = toneControl.value
  setStatus(`Tone ${Number(toneControl.value).toFixed(2)}x`, engine.isReady ? 'ready' : 'idle')
})

tailControl.addEventListener('input', syncTailControl)
tailControl.addEventListener('change', () => {
  if (tailControl.value === lastTailValue) return

  lastTailValue = tailControl.value
  setStatus(`Tail ${Number(tailControl.value).toFixed(2)}x`, engine.isReady ? 'ready' : 'idle')
})

envelopeControls.forEach((control) => {
  control.addEventListener('input', syncEnvelopeControls)

  control.addEventListener('change', () => {
    const label = control.previousElementSibling?.textContent ?? 'Envelope'

    setStatus(`${label} ${Number(control.value).toFixed(2)}`, engine.isReady ? 'ready' : 'idle')
  })
})

waveform.addEventListener('change', () => {
  if (waveform.value === lastWaveformValue) return

  lastWaveformValue = waveform.value
  const label = waveform.selectedOptions[0]?.textContent ?? waveform.value

  setStatus(`${label} waveform`, engine.isReady ? 'ready' : 'idle')
})

octaveDownButton.addEventListener('click', () => {
  void runAction(
    () => {
      const nextShift = Math.max(-1, keyboardOctaveShift - 1)

      if (nextShift === keyboardOctaveShift) return false

      keyboardOctaveShift = nextShift
      updateOctaveDisplay()
      setStatus(`Keyboard ${keyboardOctaveShift > 0 ? '+' : ''}${keyboardOctaveShift} oct`, 'ready')
      return true
    },
    octaveDownButton,
  )
})

octaveUpButton.addEventListener('click', () => {
  void runAction(
    () => {
      const nextShift = Math.min(1, keyboardOctaveShift + 1)

      if (nextShift === keyboardOctaveShift) return false

      keyboardOctaveShift = nextShift
      updateOctaveDisplay()
      setStatus(`Keyboard ${keyboardOctaveShift > 0 ? '+' : ''}${keyboardOctaveShift} oct`, 'ready')
      return true
    },
    octaveUpButton,
  )
})

presetButtons.forEach((button) => {
  button.disabled = false
  button.addEventListener('click', () => {
    void runAction(
      async () => {
        const preset = button.dataset.preset as SoundPreset
        const changed = setPreset(preset)
        const previewed = await playPreviewNote(329.63, 'E4')

        return changed || previewed
      },
      button,
    )
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
  ).then((didStart) => {
    if (!didStart) activeComputerKeys.delete(keyboardKey)
  })
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
    window.setTimeout(() => shell.classList.add('is-built'), prefersReducedMotion.matches ? 0 : 180)
  })
}

updateOctaveDisplay()
syncToneControl()
syncTailControl()
syncEnvelopeControls()
stageLandingSequence()
window.requestAnimationFrame(renderSignalDisplay)
