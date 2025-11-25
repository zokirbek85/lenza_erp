/**
 * AudioControlContext - Shared Context for Global Audio Control
 * 
 * This context provides a centralized way to control the YouTube audio player
 * from anywhere in the application, including the GlobalAudioControlBar.
 * 
 * Usage:
 * - PersistentYouTubeAudio provides the player controls
 * - GlobalAudioControlBar consumes the controls
 * - Both components share the same player instance
 */

import { createContext, useContext } from 'react';

export interface AudioControlContextType {
  // Player controls
  play: () => void;
  pause: () => void;
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
  
  // Player state
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  isReady: boolean;
  
  // Player info
  title: string;
}

// Default no-op implementation
const defaultContext: AudioControlContextType = {
  play: () => {},
  pause: () => {},
  setVolume: () => {},
  mute: () => {},
  unMute: () => {},
  isPlaying: false,
  volume: 60,
  isMuted: true,
  isReady: false,
  title: 'Background Music',
};

export const AudioControlContext = createContext<AudioControlContextType>(defaultContext);

// Custom hook for easier access
export const useAudioControl = () => {
  const context = useContext(AudioControlContext);
  if (!context) {
    throw new Error('useAudioControl must be used within AudioControlProvider');
  }
  return context;
};
