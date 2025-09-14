// TypeScript type definitions for the audio engine

export interface AudioEngineState {
  isReady: boolean;
  isRecording: boolean;
  masterGain: number;
  sustainEnabled: boolean;
  activeVoices: number;
}

export interface AudioEngineAPI {
  // State
  isReady: boolean;
  isRecording: boolean;
  masterGain: number;
  sustainEnabled: boolean;
  activeVoices: number;
  
  // Methods
  noteOn: (note: string, velocity?: number) => void;
  noteOff: (note: string) => void;
  setMasterGain: (gain: number) => void;
  setSustain: (enabled: boolean) => void;
  panic: () => void;
}

export interface Voice {
  id: number;
  note: string;
  velocity: number;
  startTime: number;
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  filterNode: BiquadFilterNode;
  isActive: boolean;
  isReleasing: boolean;
}

export interface EnvelopeParams {
  attack: number;  // seconds
  decay: number;   // seconds
  sustain: number; // level (0-1)
  release: number; // seconds
}

export interface SampleData {
  sample: AudioBuffer;
  transpose: number;
}

export interface AudioEngineEventMap {
  ready: boolean;
  masterGainChanged: number;
  sustainChanged: boolean;
  voiceCountChanged: number;
}

export type AudioEngineEventListener<T extends keyof AudioEngineEventMap> = (
  data: AudioEngineEventMap[T]
) => void;