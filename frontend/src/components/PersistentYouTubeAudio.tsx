/**
 * PersistentYouTubeAudio - Background YouTube Audio Player with Context
 * 
 * This component plays a single YouTube video as persistent background audio.
 * It is mounted at the App.tsx level and NEVER unmounts during navigation.
 * 
 * Features:
 * - Persistent across ALL pages and routes
 * - Hidden iframe (audio-only, no video visible)
 * - Auto-loop enabled
 * - Starts muted (Chrome autoplay requirement)
 * - Exposes controls via AudioControlContext
 * - Uses official YouTube IFrame API (100% ToS compliant)
 * 
 * Video: https://www.youtube.com/watch?v=rdvUByCCX1w
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import { AudioControlContext } from '../context/AudioControlContext';

// Single YouTube video ID
const VIDEO_ID = 'rdvUByCCX1w';

// YouTube IFrame API type definitions
interface YTPlayer {
  mute: () => void;
  unMute: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  isMuted: () => boolean;
  getPlayerState: () => number;
  destroy: () => void;
}

interface YTPlayerEvent {
  target: YTPlayer;
}

interface YTPlayerOptions {
  videoId: string;
  playerVars: {
    autoplay: number;
    mute: number;
    controls: number;
    modestbranding: number;
    loop: number;
    playlist: string;
  };
  events: {
    onReady: (event: YTPlayerEvent) => void;
    onStateChange?: (event: any) => void;
  };
}

declare global {
  interface Window {
    YT: {
      Player: new (elementId: string, options: YTPlayerOptions) => YTPlayer;
      ready: (callback: () => void) => void;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export default function PersistentYouTubeAudio({ children }: { children?: React.ReactNode }) {
  const playerRef = useRef<YTPlayer | null>(null);
  const hasLoadedAPI = useRef(false);
  
  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(60);
  const [isMuted, setIsMuted] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Load YouTube IFrame API
    const loadYouTubeAPI = () => {
      // Check if API already loaded
      if (window.YT && window.YT.Player) {
        initializePlayer();
        return;
      }

      // Prevent multiple script loads
      if (hasLoadedAPI.current) {
        window.onYouTubeIframeAPIReady = initializePlayer;
        return;
      }

      // Check if script already exists
      const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
      if (existingScript) {
        window.onYouTubeIframeAPIReady = initializePlayer;
        hasLoadedAPI.current = true;
        return;
      }

      // Load YouTube IFrame API script
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      hasLoadedAPI.current = true;
      window.onYouTubeIframeAPIReady = initializePlayer;
    };

    const initializePlayer = () => {
      // Prevent duplicate players
      if (playerRef.current) return;

      playerRef.current = new window.YT.Player('yt-audio-iframe', {
        videoId: VIDEO_ID,
        playerVars: {
          autoplay: 1,
          mute: 1, // Start muted (Chrome autoplay policy)
          controls: 0,
          modestbranding: 1,
          loop: 1,
          playlist: VIDEO_ID, // Required for loop to work
        },
        events: {
          onReady: (event: YTPlayerEvent) => {
            setIsReady(true);
            setIsPlaying(true);
            
            // Start playing muted
            event.target.playVideo();
            event.target.setVolume(60);
          },
          onStateChange: (event: any) => {
            // YouTube player states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
            const state = event.data;
            setIsPlaying(state === 1); // 1 = playing
          },
        },
      });
    };

    loadYouTubeAPI();

    // Cleanup on component unmount (though this should never unmount)
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, []);

  // Context value with control functions
  const contextValue = useMemo(() => ({
    play: () => {
      if (playerRef.current) {
        playerRef.current.playVideo();
        setIsPlaying(true);
      }
    },
    pause: () => {
      if (playerRef.current) {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
      }
    },
    setVolume: (vol: number) => {
      if (playerRef.current) {
        playerRef.current.setVolume(vol);
        setVolumeState(vol);
        if (vol > 0 && isMuted) {
          playerRef.current.unMute();
          setIsMuted(false);
        }
      }
    },
    mute: () => {
      if (playerRef.current) {
        playerRef.current.mute();
        setIsMuted(true);
      }
    },
    unMute: () => {
      if (playerRef.current) {
        playerRef.current.unMute();
        setIsMuted(false);
      }
    },
    isPlaying,
    volume,
    isMuted,
    isReady,
    title: 'Background Music',
  }), [isPlaying, volume, isMuted, isReady]);

  return (
    <AudioControlContext.Provider value={contextValue}>
      {/* Hidden YouTube iframe - audio only, no visual display */}
      <div
        id="yt-audio-iframe"
        style={{
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none',
          position: 'absolute',
          left: '-9999px',
        }}
      />
      
      {children}
    </AudioControlContext.Provider>
  );
}
