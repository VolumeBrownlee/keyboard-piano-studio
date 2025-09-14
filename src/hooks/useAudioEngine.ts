import { useState, useEffect, useCallback, useRef } from 'react';
import { audioEngine } from '../audio/engine.js';
import type { AudioEngineState, AudioEngineAPI } from '../audio/types';

export function useAudioEngine(): AudioEngineAPI {
  const [state, setState] = useState<AudioEngineState>({
    isReady: false,
    isRecording: false,
    masterGain: 0.7,
    sustainEnabled: false,
    activeVoices: 0,
  });

  const engineRef = useRef(audioEngine);

  // Initialize audio engine
  useEffect(() => {
    const engine = engineRef.current;

    const handleReady = (ready: boolean) => {
      setState(prev => ({ ...prev, isReady: ready }));
    };

    const handleMasterGainChanged = (gain: number) => {
      setState(prev => ({ ...prev, masterGain: gain }));
    };

    const handleSustainChanged = (enabled: boolean) => {
      setState(prev => ({ ...prev, sustainEnabled: enabled }));
    };

    const handleVoiceCountChanged = (count: number) => {
      setState(prev => ({ ...prev, activeVoices: count }));
    };

    // Set up event listeners
    engine.on('ready', handleReady);
    engine.on('masterGainChanged', handleMasterGainChanged);
    engine.on('sustainChanged', handleSustainChanged);
    engine.on('voiceCountChanged', handleVoiceCountChanged);

    // Initialize engine
    engine.initialize().catch(error => {
      console.error('Failed to initialize audio engine:', error);
    });

    // Cleanup
    return () => {
      engine.off('ready', handleReady);
      engine.off('masterGainChanged', handleMasterGainChanged);
      engine.off('sustainChanged', handleSustainChanged);
      engine.off('voiceCountChanged', handleVoiceCountChanged);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      engineRef.current.destroy();
    };
  }, []);

  const noteOn = useCallback((note: string, velocity = 0.8) => {
    engineRef.current.noteOn(note, velocity);
  }, []);

  const noteOff = useCallback((note: string) => {
    engineRef.current.noteOff(note);
  }, []);

  const setMasterGain = useCallback((gain: number) => {
    engineRef.current.setMasterGain(gain);
  }, []);

  const setSustain = useCallback((enabled: boolean) => {
    engineRef.current.setSustain(enabled);
  }, []);

  const panic = useCallback(() => {
    engineRef.current.panic();
  }, []);

  return {
    ...state,
    noteOn,
    noteOff,
    setMasterGain,
    setSustain,
    panic,
  };
}