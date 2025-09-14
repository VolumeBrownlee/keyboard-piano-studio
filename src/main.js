import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize audio engine on first user interaction
let audioInitialized = false;

const initializeAudio = async () => {
  if (audioInitialized) return;
  
  try {
    // Import and initialize the audio engine
    const { audioEngine } = await import('./audio/engine.js');
    await audioEngine.initialize();
    audioInitialized = true;
    
    console.log('AudioWorklet engine initialized successfully');
    
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