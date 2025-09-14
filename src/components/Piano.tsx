import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { useKeyMap } from '@/hooks/useKeyMap';

interface PianoKey {
  note: string;
  octave: number;
  isBlack: boolean;
  frequency: number;
}

const generatePianoKeys = (): PianoKey[] => {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const keys: PianoKey[] = [];
  
  // Generate 3 octaves (C3 to B5)
  for (let octave = 3; octave <= 5; octave++) {
    for (let i = 0; i < 12; i++) {
      const note = notes[i];
      const isBlack = note.includes('#');
      const midiNote = (octave * 12) + i + 12;
      const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
      
      keys.push({
        note: `${note}${octave}`,
        octave,
        isBlack,
        frequency
      });
    }
  }
  
  return keys;
};

interface PianoProps {
  className?: string;
  showKeyLabels?: boolean;
}

export function Piano({ className, showKeyLabels = true }: PianoProps) {
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const { noteOn, noteOff, isReady } = useAudioEngine();
  const { keyMap, getKeyForNote, getNoteForKey } = useKeyMap();
  
  const pianoKeys = generatePianoKeys();
  const whiteKeys = pianoKeys.filter(key => !key.isBlack);
  const blackKeys = pianoKeys.filter(key => key.isBlack);

  const playNote = useCallback((note: string, velocity = 0.8) => {
    if (!isReady) return;
    
    setActiveKeys(prev => new Set(prev).add(note));
    noteOn(note, velocity);
    
    // Visual feedback duration
    setTimeout(() => {
      setActiveKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(note);
        return newSet;
      });
    }, 150);
  }, [noteOn, isReady]);

  const stopNote = useCallback((note: string) => {
    if (!isReady) return;
    noteOff(note);
  }, [noteOff, isReady]);

  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      
      const note = getNoteForKey(event.code);
      if (note && !pressedKeys.has(event.code)) {
        setPressedKeys(prev => new Set(prev).add(event.code));
        playNote(note);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const note = getNoteForKey(event.code);
      if (note) {
        setPressedKeys(prev => {
          const newSet = new Set(prev);
          newSet.delete(event.code);
          return newSet;
        });
        stopNote(note);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [playNote, stopNote, getNoteForKey, pressedKeys]);

  return (
    <div className={cn("relative select-none", className)}>
      <div className="relative flex h-48 bg-gradient-studio rounded-lg shadow-studio p-4">
        {/* White Keys */}
        <div className="flex flex-1 gap-1">
          {whiteKeys.map((key, index) => {
            const isActive = activeKeys.has(key.note);
            const keyboardKey = getKeyForNote(key.note);
            
            return (
              <button
                key={key.note}
                className={cn(
                  "flex-1 bg-piano-white hover:bg-piano-white-active transition-all duration-key rounded-b-lg border border-border shadow-key",
                  "flex flex-col justify-end items-center pb-4 text-xs font-mono",
                  isActive && "bg-piano-white-active shadow-active key-press"
                )}
                onMouseDown={() => playNote(key.note)}
                onMouseUp={() => stopNote(key.note)}
                onMouseLeave={() => stopNote(key.note)}
                aria-label={`Piano key ${key.note}`}
              >
                {showKeyLabels && (
                  <>
                    <span className="text-muted-foreground">{key.note}</span>
                    {keyboardKey && (
                      <span className="text-xs text-muted-foreground/60 mt-1">
                        {keyboardKey.replace('Key', '').replace('Digit', '')}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Black Keys */}
        <div className="absolute inset-x-4 top-4 flex">
          {blackKeys.map((key, index) => {
            const isActive = activeKeys.has(key.note);
            const keyboardKey = getKeyForNote(key.note);
            
            // Calculate position based on the pattern of black keys
            const noteInOctave = key.note.charAt(0);
            const octave = key.octave;
            const whiteKeyIndex = whiteKeys.findIndex(wk => 
              wk.octave === octave && 
              wk.note.charAt(0) === (noteInOctave === 'C' ? 'C' : 
                                   noteInOctave === 'D' ? 'D' :
                                   noteInOctave === 'F' ? 'F' :
                                   noteInOctave === 'G' ? 'G' : 'A')
            );
            
            const whiteKeyWidth = `calc(100% / ${whiteKeys.length})`;
            const offset = whiteKeyIndex + (octave - 3) * 7;
            
            let leftPosition = `calc(${whiteKeyWidth} * ${offset + 0.7})`;
            
            return (
              <button
                key={key.note}
                className={cn(
                  "absolute bg-piano-black hover:bg-piano-black-active transition-all duration-key",
                  "w-6 h-28 rounded-b-md shadow-key text-white text-xs font-mono",
                  "flex flex-col justify-end items-center pb-2",
                  isActive && "bg-piano-black-active shadow-active key-press"
                )}
                style={{ left: leftPosition }}
                onMouseDown={() => playNote(key.note)}
                onMouseUp={() => stopNote(key.note)}
                onMouseLeave={() => stopNote(key.note)}
                aria-label={`Piano key ${key.note}`}
              >
                {showKeyLabels && (
                  <>
                    <span className="text-white/80">{key.note}</span>
                    {keyboardKey && (
                      <span className="text-xs text-white/60 mt-1">
                        {keyboardKey.replace('Key', '').replace('Digit', '')}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
      
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading audio engine...</p>
          </div>
        </div>
      )}
    </div>
  );
}