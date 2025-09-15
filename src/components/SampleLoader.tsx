import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { AlertCircle, Download } from 'lucide-react';

interface SampleLoaderProps {
  sampler: any;
  onLoadingComplete?: () => void;
}

export const SampleLoader: React.FC<SampleLoaderProps> = ({ 
  sampler, 
  onLoadingComplete 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(48);
  const [hasError, setHasError] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const checkCacheStatus = async () => {
    if (!sampler || !sampler.samples) return;
    
    // Check if samples are already loaded
    if (sampler.samples.size >= 48) {
      setIsComplete(true);
      setLoadedCount(48);
      onLoadingComplete?.();
      return;
    }
    
    // Check IndexedDB for cached samples
    try {
      if (sampler.db) {
        const transaction = sampler.db.transaction(['samples'], 'readonly');
        const store = transaction.objectStore('samples');
        const request = store.count();
        
        request.onsuccess = () => {
          const cachedCount = request.result;
          if (cachedCount >= 48) {
            setIsComplete(true);
            setLoadedCount(48);
            onLoadingComplete?.();
          }
        };
      }
    } catch (error) {
      console.warn('Error checking cache status:', error);
    }
  };

  const loadSamples = async () => {
    if (!sampler) return;
    
    setIsLoading(true);
    setHasError(false);
    setLoadedCount(0);
    
    try {
      await sampler.loadSamples((loaded: number, total: number) => {
        setLoadedCount(loaded);
        setTotalCount(total);
      });
      
      setIsComplete(true);
      onLoadingComplete?.();
    } catch (error) {
      console.error('Failed to load samples:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkCacheStatus();
  }, [sampler]);

  // Don't render if loading is complete
  if (isComplete) {
    return null;
  }

  const progress = totalCount > 0 ? (loadedCount / totalCount) * 100 : 0;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-background/95 backdrop-blur-sm border rounded-lg p-4 shadow-lg min-w-[320px]">
      <div className="flex items-center gap-3 mb-3">
        <Download className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">
          {isLoading ? 'Loading piano samples...' : 'Piano samples not cached'}
        </span>
      </div>
      
      {isLoading && (
        <div className="space-y-3">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{loadedCount} of {totalCount} samples</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>
      )}
      
      {hasError && (
        <div className="flex items-center gap-2 text-sm text-destructive mb-3">
          <AlertCircle className="h-4 w-4" />
          <span>Network error loading samples</span>
        </div>
      )}
      
      {!isLoading && (
        <Button 
          onClick={loadSamples}
          variant="outline" 
          size="sm"
          className="w-full"
          disabled={isLoading}
        >
          {hasError ? 'Retry Download' : 'Download Samples'}
        </Button>
      )}
    </div>
  );
};