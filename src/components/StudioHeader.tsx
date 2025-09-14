import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Square, 
  Mic, 
  Settings, 
  BookOpen, 
  Download,
  Volume2,
  VolumeX,
  Headphones
} from 'lucide-react';
import { useAudioEngine } from '@/hooks/useAudioEngine';

interface StudioHeaderProps {
  activeTab: 'play' | 'learn' | 'export' | 'settings';
  onTabChange: (tab: 'play' | 'learn' | 'export' | 'settings') => void;
}

export function StudioHeader({ activeTab, onTabChange }: StudioHeaderProps) {
  const { isReady, isRecording, masterGain, activeVoices, setMasterGain } = useAudioEngine();
  const [isMuted, setIsMuted] = useState(false);

  const toggleMute = () => {
    if (isMuted) {
      setMasterGain(0.7);
      setIsMuted(false);
    } else {
      setMasterGain(0);
      setIsMuted(true);
    }
  };

  return (
    <header className="bg-card border-b border-border p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-active rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">🎹</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-active bg-clip-text text-transparent">
              Key2Piano
            </h1>
            <p className="text-sm text-muted-foreground">
              Your keyboard is your piano
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex gap-2">
          <Button
            variant={activeTab === 'play' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onTabChange('play')}
            className="flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Play
          </Button>
          
          <Button
            variant={activeTab === 'learn' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onTabChange('learn')}
            className="flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            Learn
          </Button>
          
          <Button
            variant={activeTab === 'export' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onTabChange('export')}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          
          <Button
            variant={activeTab === 'settings' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onTabChange('settings')}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Button>
        </nav>

        {/* Audio Controls and Status */}
        <div className="flex items-center gap-3">
          {/* Active Voices Counter */}
          {activeVoices > 0 && (
            <Badge variant="secondary" className="gap-1">
              <span className="w-2 h-2 bg-audio-active rounded-full animate-pulse"></span>
              {activeVoices} active
            </Badge>
          )}

          {/* Recording Indicator */}
          {isRecording && (
            <Badge variant="destructive" className="gap-1 animate-pulse">
              <Mic className="w-3 h-3" />
              Recording
            </Badge>
          )}

          {/* Audio Status */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              className="p-2"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>

            {!isReady ? (
              <Badge variant="outline" className="gap-1">
                <div className="w-2 h-2 border border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin"></div>
                Loading
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <Headphones className="w-3 h-3" />
                Ready
              </Badge>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}