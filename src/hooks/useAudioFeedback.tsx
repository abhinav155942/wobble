import { useCallback, useRef } from 'react';

type FeedbackType = 'thinking' | 'tool_start' | 'tool_complete' | 'error' | 'message';

export const useAudioFeedback = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(true);

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback((frequency: number, duration: number, volume: number = 0.1) => {
    if (!enabledRef.current) return;
    
    try {
      const ctx = initAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (error) {
      console.error('Audio playback error:', error);
    }
  }, [initAudioContext]);

  const triggerHaptic = useCallback((pattern: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!enabledRef.current) return;
    
    try {
      if ('vibrate' in navigator) {
        const patterns = {
          light: [10],
          medium: [20],
          heavy: [30],
        };
        navigator.vibrate(patterns[pattern]);
      }
    } catch (error) {
      console.error('Haptic feedback error:', error);
    }
  }, []);

  const playFeedback = useCallback((type: FeedbackType) => {
    switch (type) {
      case 'thinking':
        playTone(400, 0.1, 0.05);
        triggerHaptic('light');
        break;
      case 'tool_start':
        playTone(600, 0.15, 0.08);
        triggerHaptic('medium');
        break;
      case 'tool_complete':
        playTone(800, 0.12, 0.08);
        playTone(1000, 0.12, 0.06);
        triggerHaptic('light');
        break;
      case 'error':
        playTone(200, 0.2, 0.1);
        triggerHaptic('heavy');
        break;
      case 'message':
        playTone(500, 0.08, 0.04);
        break;
    }
  }, [playTone, triggerHaptic]);

  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
  }, []);

  return { playFeedback, setEnabled };
};
