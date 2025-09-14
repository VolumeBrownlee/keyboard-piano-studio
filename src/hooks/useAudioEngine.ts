import { useState, useEffect, useCallback, useRef } from 'react';

interface AudioEngineState {
  isReady: boolean;
  isRecording: boolean;
  masterGain: number;
  sustainEnabled: boolean;
}

interface Voice {
  id: string;
  note: string;
  oscillator: OscillatorNode;
  gainNode: GainNode;
  startTime: number;
}

export function useAudioEngine() {
  const [state, setState] = useState<AudioEngineState>({
    isReady: false,
    isRecording: false,
    masterGain: 0.7,
    sustainEnabled: false,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const voicesRef = useRef<Map<string, Voice>>(new Map());
  const nextVoiceIdRef = useRef(0);

  // Initialize audio context and master gain
  useEffect(() => {
    const initAudio = async () => {
      try {
        // Create AudioContext
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;

        // Create master gain node
        const masterGain = audioContext.createGain();
        masterGain.gain.value = state.masterGain;
        masterGain.connect(audioContext.destination);
        masterGainRef.current = masterGain;

        // Resume context if suspended (required for user interaction)
        if (audioContext.state === 'suspended') {
          const resumeAudio = () => {
            audioContext.resume().then(() => {
              setState(prev => ({ ...prev, isReady: true }));
              document.removeEventListener('click', resumeAudio);
              document.removeEventListener('keydown', resumeAudio);
            });
          };
          
          document.addEventListener('click', resumeAudio);
          document.addEventListener('keydown', resumeAudio);
        } else {
          setState(prev => ({ ...prev, isReady: true }));
        }
      } catch (error) {
        console.error('Failed to initialize audio context:', error);
      }
    };

    initAudio();

    return () => {
      // Cleanup
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Convert note name to frequency
  const noteToFrequency = useCallback((note: string): number => {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = parseInt(note.slice(-1));
    const noteName = note.slice(0, -1);
    const noteIndex = notes.indexOf(noteName);
    
    if (noteIndex === -1) return 440; // Default to A4
    
    const midiNote = (octave * 12) + noteIndex + 12;
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }, []);

  // Create ADSR envelope for more realistic piano sound
  const createADSR = useCallback((gainNode: GainNode, startTime: number) => {
    const gain = gainNode.gain;
    const attackTime = 0.01;
    const decayTime = 0.3;
    const sustainLevel = 0.6;
    
    gain.setValueAtTime(0, startTime);
    gain.linearRampToValueAtTime(1, startTime + attackTime);
    gain.exponentialRampToValueAtTime(sustainLevel, startTime + attackTime + decayTime);
  }, []);

  // Play a note
  const noteOn = useCallback((note: string, velocity = 0.8) => {
    if (!audioContextRef.current || !masterGainRef.current) return;

    const audioContext = audioContextRef.current;
    const frequency = noteToFrequency(note);
    const startTime = audioContext.currentTime;

    // Create oscillator with multiple harmonics for richer sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Create a more piano-like sound with multiple oscillators
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(frequency, startTime);

    // Apply velocity
    gainNode.gain.setValueAtTime(0, startTime);
    const finalGain = velocity * 0.3; // Scale down to prevent clipping
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(masterGainRef.current);

    // Apply ADSR envelope
    createADSR(gainNode, startTime);
    gainNode.gain.setValueAtTime(finalGain, startTime + 0.31); // After attack + decay

    // Start oscillator
    oscillator.start(startTime);

    // Store voice for later reference
    const voiceId = `voice_${nextVoiceIdRef.current++}`;
    const voice: Voice = {
      id: voiceId,
      note,
      oscillator,
      gainNode,
      startTime
    };

    voicesRef.current.set(note, voice);

    // Auto-cleanup after 5 seconds if note isn't stopped manually
    setTimeout(() => {
      if (voicesRef.current.has(note)) {
        noteOff(note);
      }
    }, 5000);
  }, [noteToFrequency, createADSR]);

  // Stop a note
  const noteOff = useCallback((note: string) => {
    const voice = voicesRef.current.get(note);
    if (!voice || !audioContextRef.current) return;

    const audioContext = audioContextRef.current;
    const currentTime = audioContext.currentTime;
    const releaseTime = state.sustainEnabled ? 0.5 : 0.2;

    // Apply release envelope
    voice.gainNode.gain.cancelScheduledValues(currentTime);
    voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, currentTime);
    voice.gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + releaseTime);

    // Stop and cleanup oscillator
    voice.oscillator.stop(currentTime + releaseTime);
    voicesRef.current.delete(note);
  }, [state.sustainEnabled]);

  // Set master gain
  const setMasterGain = useCallback((gain: number) => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.setValueAtTime(gain, audioContextRef.current?.currentTime || 0);
      setState(prev => ({ ...prev, masterGain: gain }));
    }
  }, []);

  // Toggle sustain
  const setSustain = useCallback((enabled: boolean) => {
    setState(prev => ({ ...prev, sustainEnabled: enabled }));
  }, []);

  // Panic - stop all voices
  const panic = useCallback(() => {
    voicesRef.current.forEach((voice) => {
      try {
        voice.oscillator.stop();
      } catch (error) {
        // Ignore errors from already stopped oscillators
      }
    });
    voicesRef.current.clear();
  }, []);

  return {
    ...state,
    noteOn,
    noteOff,
    setMasterGain,
    setSustain,
    panic,
    activeVoices: voicesRef.current.size,
  };
}