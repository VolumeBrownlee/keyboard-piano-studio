import { useState } from 'react';
import { StudioHeader } from '@/components/StudioHeader';
import { Piano } from '@/components/Piano';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Music, 
  Keyboard, 
  Layers, 
  Zap,
  Play,
  BookOpen,
  Download,
  Lightbulb
} from 'lucide-react';

type StudioTab = 'play' | 'learn' | 'export' | 'settings';

export default function StudioPage() {
  const [activeTab, setActiveTab] = useState<StudioTab>('play');
  const [showKeyLabels, setShowKeyLabels] = useState(true);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'play':
        return (
          <div className="space-y-6">
            {/* Quick Start Guide */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  Quick Start
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-start gap-3">
                    <Badge variant="secondary" className="mt-0.5">1</Badge>
                    <div>
                      <p className="font-medium">Play with keyboard</p>
                      <p className="text-muted-foreground">Use QWERTY keys to play notes. Bottom row = C3 octave, top row = C4 octave.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="secondary" className="mt-0.5">2</Badge>
                    <div>
                      <p className="font-medium">Click piano keys</p>
                      <p className="text-muted-foreground">Mouse click on the virtual piano to play notes directly.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="secondary" className="mt-0.5">3</Badge>
                    <div>
                      <p className="font-medium">Start learning</p>
                      <p className="text-muted-foreground">Switch to Learn tab for interactive lessons and tutorials.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Piano Interface */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Keyboard className="w-5 h-5" />
                    Virtual Piano
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowKeyLabels(!showKeyLabels)}
                    >
                      {showKeyLabels ? 'Hide Labels' : 'Show Labels'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Piano showKeyLabels={showKeyLabels} />
              </CardContent>
            </Card>

            {/* Features Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Layers className="w-5 h-5" />
                    Smart Looper
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Hold a chord for 600ms to trigger intelligent backing tracks with bass and drums.
                  </p>
                  <Badge variant="secondary">Coming Soon</Badge>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BookOpen className="w-5 h-5" />
                    Adaptive Lessons
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    30 progressive lessons with accuracy tracking and adaptive tempo adjustments.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setActiveTab('learn')}
                  >
                    Start Learning
                  </Button>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Download className="w-5 h-5" />
                    TikTok Export
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Record your performance with visual effects and export as shareable video.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setActiveTab('export')}
                  >
                    Export Video
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'learn':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Interactive Lessons</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Learning System</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Interactive piano lessons with real-time feedback, accuracy tracking, and adaptive difficulty.
                </p>
                <Badge variant="secondary">Feature in development</Badge>
              </div>
            </CardContent>
          </Card>
        );

      case 'export':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Video Export</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Download className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">TikTok Export</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Record your piano performance with beautiful visual effects and export as MP4 for social sharing.
                </p>
                <Badge variant="secondary">Feature in development</Badge>
              </div>
            </CardContent>
          </Card>
        );

      case 'settings':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Settings & Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Audio & Controls</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Customize keyboard mapping, audio latency, velocity curves, and RGB lighting integration.
                </p>
                <Badge variant="secondary">Feature in development</Badge>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <StudioHeader activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="max-w-7xl mx-auto p-6">
        {renderTabContent()}
      </main>
    </div>
  );
}