// Voice management system for 64-voice polyphony with oldest-voice stealing

export class VoiceManager {
  constructor(audioContext, sampler) {
    this.audioContext = audioContext;
    this.sampler = sampler;
    this.voices = new Map(); // note -> voice object
    this.maxVoices = 64;
    this.nextVoiceId = 0;
    
    // ADSR parameters (in seconds)
    this.envelope = {
      attack: 0.02,
      decay: 0.3,
      sustain: 0.7,
      release: 0.4
    };
  }
  
  noteOn(note, velocity = 0.8) {
    // Stop existing voice for this note
    if (this.voices.has(note)) {
      this.noteOff(note);
    }
    
    // Voice stealing if at limit
    if (this.voices.size >= this.maxVoices) {
      this.stealOldestVoice();
    }
    
    const voice = this.createVoice(note, velocity);
    if (voice) {
      this.voices.set(note, voice);
      voice.start();
    }
  }
  
  noteOff(note) {
    const voice = this.voices.get(note);
    if (voice && voice.isActive) {
      voice.release();
    }
  }
  
  createVoice(note, velocity) {
    try {
      // Get sample or closest match
      const sampleData = this.sampler.getClosestSample(note);
      if (!sampleData) {
        console.warn(`No sample available for note ${note}`);
        return null;
      }
      
      const { sample, transpose } = sampleData;
      const voiceId = this.nextVoiceId++;
      const startTime = this.audioContext.currentTime;
      
      // Create audio nodes
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      const filterNode = this.audioContext.createBiquadFilter();
      
      // Configure source
      source.buffer = sample;
      source.playbackRate.value = transpose;
      source.loop = false;
      
      // Configure filter for more realistic piano sound
      filterNode.type = 'lowpass';
      filterNode.frequency.setValueAtTime(
        Math.min(20000, 2000 + (velocity * 8000)), 
        startTime
      );
      filterNode.Q.setValueAtTime(1, startTime);
      
      // Configure gain with ADSR envelope
      gainNode.gain.setValueAtTime(0, startTime);
      
      // Connect audio graph
      source.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Create voice object
      const voice = {
        id: voiceId,
        note,
        velocity,
        startTime,
        source,
        gainNode,
        filterNode,
        isActive: true,
        isReleasing: false,
        
        start() {
          this.applyAttackDecay();
          this.source.start(startTime);
          
          // Set up automatic cleanup
          this.source.onended = () => {
            this.cleanup();
          };
        },
        
        applyAttackDecay() {
          const { attack, decay, sustain } = this.envelope;
          const gain = this.gainNode.gain;
          const finalGain = velocity * 0.3; // Scale to prevent clipping
          
          // Attack phase
          gain.setValueAtTime(0, startTime);
          gain.linearRampToValueAtTime(finalGain, startTime + attack);
          
          // Decay phase
          gain.exponentialRampToValueAtTime(
            finalGain * sustain,
            startTime + attack + decay
          );
        },
        
        release() {
          if (this.isReleasing) return;
          
          this.isReleasing = true;
          const releaseStartTime = this.audioContext.currentTime;
          const currentGain = this.gainNode.gain.value;
          
          // Cancel any scheduled changes and apply release envelope
          this.gainNode.gain.cancelScheduledValues(releaseStartTime);
          this.gainNode.gain.setValueAtTime(currentGain, releaseStartTime);
          this.gainNode.gain.exponentialRampToValueAtTime(
            0.001,
            releaseStartTime + this.envelope.release
          );
          
          // Schedule cleanup
          setTimeout(() => {
            this.cleanup();
          }, this.envelope.release * 1000 + 100); // Add small buffer
        },
        
        forceStop() {
          try {
            if (this.source && this.source.playbackState !== this.source.FINISHED_STATE) {
              this.source.stop();
            }
          } catch (error) {
            // Ignore errors from already stopped sources
          }
          this.cleanup();
        },
        
        cleanup() {
          this.isActive = false;
          
          try {
            // Disconnect nodes
            if (this.source) {
              this.source.disconnect();
            }
            if (this.filterNode) {
              this.filterNode.disconnect();
            }
            if (this.gainNode) {
              this.gainNode.disconnect();
            }
          } catch (error) {
            // Ignore cleanup errors
          }
          
          // Remove from voice map
          if (this.voices && this.voices.has(this.note)) {
            this.voices.delete(this.note);
          }
        }
      };
      
      // Bind the voice manager's envelope and voices reference
      voice.envelope = this.envelope;
      voice.voices = this.voices;
      
      return voice;
      
    } catch (error) {
      console.error(`Failed to create voice for note ${note}:`, error);
      return null;
    }
  }
  
  stealOldestVoice() {
    let oldestVoice = null;
    let oldestTime = Infinity;
    
    // Find the oldest non-releasing voice
    for (const [note, voice] of this.voices) {
      if (!voice.isReleasing && voice.startTime < oldestTime) {
        oldestTime = voice.startTime;
        oldestVoice = voice;
      }
    }
    
    // If no non-releasing voice found, take any oldest voice
    if (!oldestVoice) {
      for (const [note, voice] of this.voices) {
        if (voice.startTime < oldestTime) {
          oldestTime = voice.startTime;
          oldestVoice = voice;
        }
      }
    }
    
    if (oldestVoice) {
      oldestVoice.forceStop();
    }
  }
  
  panic() {
    // Stop all voices immediately
    for (const [note, voice] of this.voices) {
      voice.forceStop();
    }
    this.voices.clear();
  }
  
  setSustain(enabled) {
    // If sustain is disabled, release all currently held voices
    if (!enabled) {
      for (const [note, voice] of this.voices) {
        if (voice.isActive && !voice.isReleasing) {
          // Don't auto-release, let them sustain naturally
        }
      }
    }
  }
  
  setEnvelope(newEnvelope) {
    this.envelope = { ...this.envelope, ...newEnvelope };
  }
  
  getActiveVoiceCount() {
    let count = 0;
    for (const voice of this.voices.values()) {
      if (voice.isActive) {
        count++;
      }
    }
    return count;
  }
  
  getVoicesForNote(note) {
    return this.voices.get(note);
  }
  
  getAllVoices() {
    return Array.from(this.voices.values());
  }
}