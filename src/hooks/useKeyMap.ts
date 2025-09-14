import { useState, useCallback, useMemo } from 'react';

interface KeyMapping {
  [keyCode: string]: string; // keyCode -> note
}

interface KeyMapHook {
  keyMap: KeyMapping;
  setKeyMap: (mapping: KeyMapping) => void;
  getKeyForNote: (note: string) => string | undefined;
  getNoteForKey: (keyCode: string) => string | undefined;
  resetToDefault: () => void;
}

// Default QWERTY to piano mapping - covers 2 octaves
const DEFAULT_KEY_MAP: KeyMapping = {
  // Bottom row - C3 octave (white keys)
  'KeyZ': 'C3',
  'KeyX': 'D3', 
  'KeyC': 'E3',
  'KeyV': 'F3',
  'KeyB': 'G3',
  'KeyN': 'A3',
  'KeyM': 'B3',
  
  // Bottom row black keys
  'KeyS': 'C#3',
  'KeyD': 'D#3',
  'KeyG': 'F#3',
  'KeyH': 'G#3',
  'KeyJ': 'A#3',
  
  // Top row - C4 octave (white keys)
  'KeyQ': 'C4',
  'KeyW': 'D4',
  'KeyE': 'E4',
  'KeyR': 'F4',
  'KeyT': 'G4',
  'KeyY': 'A4',
  'KeyU': 'B4',
  
  // Top row black keys
  'Digit2': 'C#4',
  'Digit3': 'D#4',
  'Digit5': 'F#4',
  'Digit6': 'G#4',
  'Digit7': 'A#4',
  
  // Extended range
  'KeyI': 'C5',
  'KeyO': 'D5',
  'KeyP': 'E5',
  'BracketLeft': 'F5',
  'BracketRight': 'G5',
  
  // Extended black keys
  'Digit9': 'C#5',
  'Digit0': 'D#5',
  'Equal': 'F#5',
};

// Load saved key mapping from localStorage
const loadKeyMap = (): KeyMapping => {
  try {
    const saved = localStorage.getItem('key2piano-keymap');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Validate that it's a proper key mapping
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('Failed to load key mapping from localStorage:', error);
  }
  
  return DEFAULT_KEY_MAP;
};

// Save key mapping to localStorage
const saveKeyMap = (keyMap: KeyMapping): void => {
  try {
    localStorage.setItem('key2piano-keymap', JSON.stringify(keyMap));
  } catch (error) {
    console.warn('Failed to save key mapping to localStorage:', error);
  }
};

export function useKeyMap(): KeyMapHook {
  const [keyMap, setKeyMapState] = useState<KeyMapping>(loadKeyMap);

  const setKeyMap = useCallback((mapping: KeyMapping) => {
    setKeyMapState(mapping);
    saveKeyMap(mapping);
  }, []);

  const resetToDefault = useCallback(() => {
    setKeyMapState(DEFAULT_KEY_MAP);
    saveKeyMap(DEFAULT_KEY_MAP);
  }, []);

  // Create reverse mapping for quick lookups
  const reverseKeyMap = useMemo(() => {
    const reverse: { [note: string]: string } = {};
    Object.entries(keyMap).forEach(([keyCode, note]) => {
      reverse[note] = keyCode;
    });
    return reverse;
  }, [keyMap]);

  const getKeyForNote = useCallback((note: string): string | undefined => {
    return reverseKeyMap[note];
  }, [reverseKeyMap]);

  const getNoteForKey = useCallback((keyCode: string): string | undefined => {
    return keyMap[keyCode];
  }, [keyMap]);

  return {
    keyMap,
    setKeyMap,
    getKeyForNote,
    getNoteForKey,
    resetToDefault,
  };
}