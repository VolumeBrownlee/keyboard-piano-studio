// AudioWorklet processor for real-time audio synthesis
// Runs on audio thread with guaranteed 128-sample buffer @ 44.1kHz

class Key2PianoProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    
    this.voices = new Map(); // Active voices: note -> voiceData
    this.masterGain = 0.7;
    this.sustainEnabled = false;
    this.sampleRate = 44100;
    this.nextVoiceId = 0;
    
    // Listen for messages from main thread
    this.port.onmessage = this.handleMessage.bind(this);
  }
  
  handleMessage(event) {
    const { type, data } = event.data;
    
    switch (type) {
      case 'noteOn':
        this.noteOn(data.note, data.velocity || 0.8);
        break;
      case 'noteOff':
        this.noteOff(data.note);
        break;
      case 'sustain':
        this.sustainEnabled = data.value;
        break;
      case 'masterGain':
        this.masterGain = Math.max(0, Math.min(1, data.value));
        break;
      case 'panic':
        this.panic();
        break;
      case 'setSample':
        // For future sample integration
        break;
    }
  }
  
  noteOn(note, velocity = 0.8) {
    // Stop existing voice for this note
    if (this.voices.has(note)) {
      this.noteOff(note);
    }
    
    const frequency = this.noteToFrequency(note);
    const voiceId = this.nextVoiceId++;
    
    const voice = {
      id: voiceId,
      note,
      frequency,
      velocity: Math.max(0, Math.min(1, velocity)),
      phase: 0,
      phaseIncrement: (2 * Math.PI * frequency) / this.sampleRate,
      envelope: {
        stage: 'attack', // attack, decay, sustain, release
        value: 0,
        attackTime: 0.02 * this.sampleRate, // 20ms
        decayTime: 0.3 * this.sampleRate,   // 300ms
        sustainLevel: 0.7,
        releaseTime: 0.4 * this.sampleRate, // 400ms
        sampleCount: 0
      },
      startTime: currentTime,
      active: true
    };
    
    this.voices.set(note, voice);
    
    // Voice limiting - remove oldest if > 64 voices
    if (this.voices.size > 64) {
      let oldestVoice = null;
      let oldestTime = Infinity;
      
      for (const [noteKey, voice] of this.voices) {
        if (voice.startTime < oldestTime) {
          oldestTime = voice.startTime;
          oldestVoice = noteKey;
        }
      }
      
      if (oldestVoice) {
        this.voices.delete(oldestVoice);
      }
    }
  }
  
  noteOff(note) {
    const voice = this.voices.get(note);
    if (voice && voice.active) {
      voice.envelope.stage = 'release';
      voice.envelope.sampleCount = 0;
    }
  }
  
  panic() {
    this.voices.clear();
  }
  
  noteToFrequency(note) {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = parseInt(note.slice(-1));
    const noteName = note.slice(0, -1);
    const noteIndex = notes.indexOf(noteName);
    
    if (noteIndex === -1) return 440; // Default to A4
    
    const midiNote = (octave * 12) + noteIndex + 12;
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }
  
  processEnvelope(voice) {
    const env = voice.envelope;
    
    switch (env.stage) {
      case 'attack':
        env.value = env.sampleCount / env.attackTime;
        if (env.sampleCount >= env.attackTime) {
          env.stage = 'decay';
          env.sampleCount = 0;
          env.value = 1;
        }
        break;
        
      case 'decay':
        const decayProgress = env.sampleCount / env.decayTime;
        env.value = 1 - (decayProgress * (1 - env.sustainLevel));
        if (env.sampleCount >= env.decayTime) {
          env.stage = 'sustain';
          env.value = env.sustainLevel;
        }
        break;
        
      case 'sustain':
        env.value = env.sustainLevel;
        if (!this.sustainEnabled) {
          // Auto-release after sustain if sustain pedal not pressed
        }
        break;
        
      case 'release':
        const releaseProgress = env.sampleCount / env.releaseTime;
        env.value = env.sustainLevel * (1 - releaseProgress);
        if (env.sampleCount >= env.releaseTime || env.value <= 0.001) {
          voice.active = false;
        }
        break;
    }
    
    env.sampleCount++;
    return Math.max(0, Math.min(1, env.value));
  }
  
  generateSample(voice) {
    // Enhanced oscillator with multiple harmonics for richer piano-like sound
    const fundamental = Math.sin(voice.phase);
    const harmonic2 = 0.3 * Math.sin(voice.phase * 2);
    const harmonic3 = 0.15 * Math.sin(voice.phase * 3);
    const harmonic4 = 0.075 * Math.sin(voice.phase * 4);
    
    const sample = fundamental + harmonic2 + harmonic3 + harmonic4;
    
    // Apply envelope
    const envelopeValue = this.processEnvelope(voice);
    
    // Update phase
    voice.phase += voice.phaseIncrement;
    if (voice.phase >= 2 * Math.PI) {
      voice.phase -= 2 * Math.PI;
    }
    
    return sample * envelopeValue * voice.velocity;
  }
  
  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const outputChannels = output.length;
    const bufferLength = output[0].length; // 128 samples
    
    // Clear output buffers
    for (let channel = 0; channel < outputChannels; channel++) {
      output[channel].fill(0);
    }
    
    // Process all active voices
    for (let sample = 0; sample < bufferLength; sample++) {
      let mixedSample = 0;
      
      // Sum all voice outputs
      for (const [note, voice] of this.voices) {
        if (voice.active) {
          mixedSample += this.generateSample(voice);
        }
      }
      
      // Apply master gain and soft clipping
      mixedSample *= this.masterGain;
      mixedSample = Math.tanh(mixedSample); // Soft clipping to prevent harsh distortion
      
      // Write to all output channels (mono to stereo)
      for (let channel = 0; channel < outputChannels; channel++) {
        output[channel][sample] = mixedSample;
      }
    }
    
    // Remove inactive voices
    for (const [note, voice] of this.voices) {
      if (!voice.active) {
        this.voices.delete(note);
      }
    }
    
    // Send voice count back to main thread
    this.port.postMessage({
      type: 'voiceCount',
      count: this.voices.size
    });
    
    return true; // Keep processor alive
  }
}

registerProcessor('key2piano-processor', Key2PianoProcessor);