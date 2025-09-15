// Sample loading and caching system
// Fetches CC0 piano samples, caches in IndexedDB, falls back to wavetables

const SAMPLE_BASE_URL = '/samples/piano/';
const SAMPLE_FORMAT = '.wav';
const DB_NAME = 'key2piano-samples-v1';
const DB_VERSION = 1;
const STORE_NAME = 'samples';

// Generate all note names from C2 to B5 (48 notes)
const generateNoteNames = () => {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const noteNames = [];
  
  for (let octave = 2; octave <= 5; octave++) {
    for (const note of notes) {
      noteNames.push(`${note}${octave}`);
    }
  }
  
  return noteNames;
};

export class Sampler {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.samples = new Map();
    this.db = null;
    this.isLoading = false;
    this.loadPromise = null;
    this.noteNames = generateNoteNames();
    this.progressCallback = null;
  }
  
  async initialize() {
    if (this.loadPromise) {
      return this.loadPromise;
    }
    
    this.loadPromise = this._initializeInternal();
    return this.loadPromise;
  }
  
  async _initializeInternal() {
    try {
      // Open IndexedDB
      await this.openDB();
      
      // Load samples from cache or fetch
      await this.loadSamples();
      
      console.log(`Sampler initialized with ${this.samples.size} samples`);
    } catch (error) {
      console.error('Sampler initialization failed:', error);
      // Continue with wavetable fallback
    }
  }
  
  async openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });
  }
  
  async loadSamples(progressCallback) {
    this.progressCallback = progressCallback;
    let loaded = 0;
    const total = this.noteNames.length;
    
    const loadPromises = this.noteNames.map(async (note) => {
      try {
        await this.loadSample(note);
      } finally {
        loaded++;
        if (this.progressCallback) {
          this.progressCallback(loaded, total);
        }
      }
    });
    
    await Promise.allSettled(loadPromises);
  }
  
  async loadSample(note) {
    try {
      // Try to load from cache first
      const cachedSample = await this.getCachedSample(note);
      if (cachedSample) {
        this.samples.set(note, cachedSample);
        return;
      }
      
      // Fetch from network
      const sampleUrl = `${SAMPLE_BASE_URL}${note}${SAMPLE_FORMAT}`;
      const response = await fetch(sampleUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sample for ${note}: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Cache the sample
      await this.cacheSample(note, arrayBuffer);
      
      this.samples.set(note, audioBuffer);
      
    } catch (error) {
      console.warn(`Failed to load sample for ${note}, using wavetable fallback:`, error);
      
      // Generate wavetable fallback
      const wavetable = this.generateWavetable(note);
      this.samples.set(note, wavetable);
    }
  }
  
  async getCachedSample(note) {
    if (!this.db) return null;
    
    try {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(note);
        
        request.onsuccess = async () => {
          if (request.result) {
            try {
              const audioBuffer = await this.audioContext.decodeAudioData(request.result.slice());
              resolve(audioBuffer);
            } catch (error) {
              console.warn(`Failed to decode cached sample for ${note}:`, error);
              resolve(null);
            }
          } else {
            resolve(null);
          }
        };
        
        request.onerror = () => resolve(null);
      });
    } catch (error) {
      console.warn(`Error accessing cached sample for ${note}:`, error);
      return null;
    }
  }
  
  async cacheSample(note, arrayBuffer) {
    if (!this.db) return;
    
    try {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put(arrayBuffer, note);
    } catch (error) {
      console.warn(`Failed to cache sample for ${note}:`, error);
    }
  }
  
  generateWavetable(note) {
    // Generate a piano-like wavetable for fallback
    const frequency = this.noteToFrequency(note);
    const sampleRate = this.audioContext.sampleRate;
    const duration = 3; // 3 seconds
    const length = sampleRate * duration;
    
    const audioBuffer = this.audioContext.createBuffer(1, length, sampleRate);
    const channelData = audioBuffer.getChannelData(0);
    
    // Generate complex waveform with harmonics and ADSR envelope
    for (let i = 0; i < length; i++) {
      const time = i / sampleRate;
      const phase = 2 * Math.PI * frequency * time;
      
      // Multiple harmonics for richer sound
      let sample = 0;
      sample += 1.0 * Math.sin(phase);           // Fundamental
      sample += 0.3 * Math.sin(phase * 2);      // 2nd harmonic
      sample += 0.15 * Math.sin(phase * 3);     // 3rd harmonic
      sample += 0.075 * Math.sin(phase * 4);    // 4th harmonic
      sample += 0.05 * Math.sin(phase * 5);     // 5th harmonic
      
      // Apply ADSR envelope
      const envelope = this.calculateEnvelope(time, duration);
      sample *= envelope;
      
      // Apply some natural decay
      sample *= Math.exp(-time * 0.5);
      
      channelData[i] = sample * 0.3; // Scale down to prevent clipping
    }
    
    return audioBuffer;
  }
  
  calculateEnvelope(time, duration) {
    const attackTime = 0.02;
    const decayTime = 0.3;
    const sustainLevel = 0.7;
    const releaseStart = duration - 0.4;
    
    if (time < attackTime) {
      return time / attackTime;
    } else if (time < attackTime + decayTime) {
      const decayProgress = (time - attackTime) / decayTime;
      return 1 - (decayProgress * (1 - sustainLevel));
    } else if (time < releaseStart) {
      return sustainLevel;
    } else {
      const releaseProgress = (time - releaseStart) / 0.4;
      return sustainLevel * (1 - releaseProgress);
    }
  }
  
  noteToFrequency(note) {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = parseInt(note.slice(-1));
    const noteName = note.slice(0, -1);
    const noteIndex = notes.indexOf(noteName);
    
    if (noteIndex === -1) return 440;
    
    const midiNote = (octave * 12) + noteIndex + 12;
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }
  
  getSample(note) {
    return this.samples.get(note);
  }
  
  getBuffer(note) {
    return this.samples.get(note);
  }
  
  hasSample(note) {
    return this.samples.has(note);
  }
  
  // Get closest available sample for a given note
  getClosestSample(note) {
    if (this.samples.has(note)) {
      return { sample: this.samples.get(note), transpose: 0 };
    }
    
    // Find closest sample and calculate transpose ratio
    const targetFreq = this.noteToFrequency(note);
    let closestNote = null;
    let minDistance = Infinity;
    
    for (const sampleNote of this.samples.keys()) {
      const sampleFreq = this.noteToFrequency(sampleNote);
      const distance = Math.abs(Math.log2(targetFreq / sampleFreq));
      
      if (distance < minDistance) {
        minDistance = distance;
        closestNote = sampleNote;
      }
    }
    
    if (closestNote) {
      const closestFreq = this.noteToFrequency(closestNote);
      const transpose = targetFreq / closestFreq;
      
      return {
        sample: this.samples.get(closestNote),
        transpose
      };
    }
    
    return null;
  }
  
  // Clear cache
  async clearCache() {
    if (!this.db) return;
    
    try {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      await store.clear();
    } catch (error) {
      console.error('Failed to clear sample cache:', error);
    }
  }
}