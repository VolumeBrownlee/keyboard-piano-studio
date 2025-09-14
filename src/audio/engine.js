// Main thread audio engine wrapper
// Manages AudioWorklet and exposes high-level API

export class AudioEngine {
  constructor() {
    this.audioContext = null;
    this.processorNode = null;
    this.isReady = false;
    this.isRecording = false;
    this.masterGain = 0.7;
    this.sustainEnabled = false;
    this.activeVoices = 0;
    this.listeners = new Map();
  }
  
  async initialize() {
    try {
      // Create AudioContext with optimal settings
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        latencyHint: 'interactive',
        sampleRate: 44100
      });
      
      // Load and register the AudioWorklet processor
      await this.audioContext.audioWorklet.addModule('/src/audio/processor.js');
      
      // Create processor node
      this.processorNode = new AudioWorkletNode(this.audioContext, 'key2piano-processor', {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [2] // Stereo output
      });
      
      // Connect to destination
      this.processorNode.connect(this.audioContext.destination);
      
      // Listen for messages from processor
      this.processorNode.port.onmessage = this.handleProcessorMessage.bind(this);
      
      // Handle context state
      if (this.audioContext.state === 'suspended') {
        // Wait for user interaction to resume
        const resumeAudio = async () => {
          await this.audioContext.resume();
          this.isReady = true;
          this.emit('ready', true);
          document.removeEventListener('click', resumeAudio);
          document.removeEventListener('keydown', resumeAudio);
        };
        
        document.addEventListener('click', resumeAudio);
        document.addEventListener('keydown', resumeAudio);
      } else {
        this.isReady = true;
        this.emit('ready', true);
      }
      
    } catch (error) {
      console.error('Failed to initialize AudioWorklet engine:', error);
      throw error;
    }
  }
  
  handleProcessorMessage(event) {
    const { type, count } = event.data;
    
    if (type === 'voiceCount') {
      this.activeVoices = count;
      this.emit('voiceCountChanged', count);
    }
  }
  
  noteOn(note, velocity = 0.8) {
    if (!this.isReady || !this.processorNode) return;
    
    this.processorNode.port.postMessage({
      type: 'noteOn',
      data: { note, velocity }
    });
  }
  
  noteOff(note) {
    if (!this.isReady || !this.processorNode) return;
    
    this.processorNode.port.postMessage({
      type: 'noteOff',
      data: { note }
    });
  }
  
  setSustain(enabled) {
    this.sustainEnabled = enabled;
    
    if (!this.isReady || !this.processorNode) return;
    
    this.processorNode.port.postMessage({
      type: 'sustain',
      data: { value: enabled }
    });
    
    this.emit('sustainChanged', enabled);
  }
  
  setMasterGain(gain) {
    // Convert from linear to dB if needed, or use directly
    const linearGain = typeof gain === 'number' ? gain : Math.pow(10, gain / 20);
    this.masterGain = Math.max(0, Math.min(1, linearGain));
    
    if (!this.isReady || !this.processorNode) return;
    
    this.processorNode.port.postMessage({
      type: 'masterGain',
      data: { value: this.masterGain }
    });
    
    this.emit('masterGainChanged', this.masterGain);
  }
  
  panic() {
    if (!this.isReady || !this.processorNode) return;
    
    this.processorNode.port.postMessage({
      type: 'panic'
    });
  }
  
  // Event system for state updates
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }
  
  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }
  
  emit(event, data) {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in audio engine event listener:', error);
      }
    });
  }
  
  // Get current state
  getState() {
    return {
      isReady: this.isReady,
      isRecording: this.isRecording,
      masterGain: this.masterGain,
      sustainEnabled: this.sustainEnabled,
      activeVoices: this.activeVoices
    };
  }
  
  // Cleanup
  destroy() {
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.listeners.clear();
    this.isReady = false;
  }
}

// Singleton instance for the application
export const audioEngine = new AudioEngine();