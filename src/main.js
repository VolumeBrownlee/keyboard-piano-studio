import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize audio engine with sample cache on first user interaction
let audioInitialized = false;

const initializeAudio = async () => {
  if (audioInitialized) return;
  
  try {
    // Import and initialize the audio engine with sampler
    const { audioEngine } = await import('./audio/engine.js');
    const { Sampler } = await import('./audio/sampler.js');
    
    await audioEngine.initialize();
    
    // Initialize sampler for sample cache
    const sampler = new Sampler(audioEngine.audioContext);
    await sampler.initialize();
    
    audioInitialized = true;
    
    console.log('AudioWorklet engine with sample cache initialized successfully');
    
    // Remove event listeners
    document.removeEventListener('click', initializeAudio);
    document.removeEventListener('keydown', initializeAudio);
  } catch (error) {
    console.error('Failed to initialize AudioWorklet engine:', error);
  }
};

// Wait for user interaction before initializing audio
document.addEventListener('click', initializeAudio);
document.addEventListener('keydown', initializeAudio);

createRoot(document.getElementById("root")!).render(<App />);