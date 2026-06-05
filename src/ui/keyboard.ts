export type SynthNote = {
  frequency: number
  key: string
  label: string
  sharp?: boolean
}

export const notes: SynthNote[] = [
  { label: 'C4', frequency: 261.63, key: 'a' },
  { label: 'C#4', frequency: 277.18, key: 'w', sharp: true },
  { label: 'D4', frequency: 293.66, key: 's' },
  { label: 'D#4', frequency: 311.13, key: 'e', sharp: true },
  { label: 'E4', frequency: 329.63, key: 'd' },
  { label: 'F4', frequency: 349.23, key: 'f' },
  { label: 'F#4', frequency: 369.99, key: 't', sharp: true },
  { label: 'G4', frequency: 392.0, key: 'g' },
  { label: 'G#4', frequency: 415.3, key: 'y', sharp: true },
  { label: 'A4', frequency: 440.0, key: 'h' },
  { label: 'A#4', frequency: 466.16, key: 'u', sharp: true },
  { label: 'B4', frequency: 493.88, key: 'j' },
  { label: 'C5', frequency: 523.25, key: 'k' },
  { label: 'C#5', frequency: 554.37, key: 'o', sharp: true },
  { label: 'D5', frequency: 587.33, key: 'l' },
  { label: 'D#5', frequency: 622.25, key: 'p', sharp: true },
  { label: 'E5', frequency: 659.25, key: ';' },
]

export const notesByKeyboardKey = new Map(notes.map((note) => [note.key, note]))

export const transposeFrequency = (frequency: number, octaveShift: number) =>
  frequency * 2 ** octaveShift

export const getKeyboardVoiceId = (keyboardKey: string) => `keyboard-${keyboardKey}`

export const getPointerVoiceId = (noteLabel: string) => `pointer-${noteLabel}`
