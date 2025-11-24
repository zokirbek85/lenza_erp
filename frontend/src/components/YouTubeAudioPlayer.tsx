/**
 * YouTubeAudioPlayer - Simple Non-Persistent YouTube Audio Player
 * 
 * This component plays a single YouTube video as background audio.
 * It is NOT persistent - it only plays on the page where it's mounted.
 * 
 * Features:
 * - Single YouTube video source
 * - Hidden iframe (audio-only mode)
 * - Auto-loop enabled
 * - Autoplay with muted start (browser requirement)
 * - Unmutes on user interaction
 * - No controls, no UI panel
 * 
 * Video: https://www.youtube.com/watch?v=rdvUByCCX1w
 */

import { useEffect, useRef, useState } from 'react';

// YouTube video ID
const VIDEO_ID = 'rdvUByCCX1w';

// YouTube IFrame API type definitions
interface YTPlayer {
  mute: () => void;
  unMute: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
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

export default function YouTubeAudioPlayer() {
  const playerRef = useRef<YTPlayer | null>(null);
  const [isUnmuted, setIsUnmuted] = useState(false);
  const hasUnmuted = useRef(false);

  useEffect(() => {
    // Load YouTube IFrame API
    const loadYouTubeAPI = () => {
      if (window.YT && window.YT.Player) {
        initializePlayer();
        return;
      }

      // Check if script already exists
      if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        window.onYouTubeIframeAPIReady = initializePlayer;
        return;
      }

      // Create and load script
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = initializePlayer;
    };

    const initializePlayer = () => {
      if (playerRef.current) return;

      playerRef.current = new window.YT.Player('ERP_YT_PLAYER', {
        videoId: VIDEO_ID,
        playerVars: {
          autoplay: 1,
          mute: 1, // Start muted (Chrome autoplay requirement)
          controls: 0,
          modestbranding: 1,
          loop: 1,
          playlist: VIDEO_ID, // Required for loop to work
        },
        events: {
          onReady: (event: YTPlayerEvent) => {
            event.target.mute();
            event.target.playVideo();
          },
        },
      });
    };

    loadYouTubeAPI();

    // Cleanup on unmount
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, []);

  // Handle user interaction to unmute
  useEffect(() => {
    const handleInteraction = () => {
      if (!hasUnmuted.current && playerRef.current) {
        playerRef.current.unMute();
        setIsUnmuted(true);
        hasUnmuted.current = true;
      }
    };

    // Listen for any user interaction
    document.addEventListener('click', handleInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleInteraction);
    };
  }, []);

  return (
    <>
      {/* Hidden YouTube iframe - audio only */}
      <div
        id="ERP_YT_PLAYER"
        style={{
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none',
          position: 'absolute',
          left: '-9999px',
        }}
      />

      {/* Muted warning - shows until user clicks */}
      {!isUnmuted && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            zIndex: 9998,
            maxWidth: '250px',
          }}
        >
          🎵 Background music is playing (muted). Click anywhere to enable sound.
        </div>
      )}
    </>
  );
}
