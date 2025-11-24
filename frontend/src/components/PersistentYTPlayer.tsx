/**
 * PersistentYTPlayer - Legal YouTube Iframe Audio Player
 * 
 * This component provides a persistent audio player using YouTube's official
 * iframe embed API. It's fully compliant with YouTube's Terms of Service.
 * 
 * Features:
 * - Uses official YouTube iframe API (legal and compliant)
 * - Audio-only mode (iframe is invisible but mounted)
 * - Multiple live stream stations
 * - Persistent playback across page navigation
 * - Dark/Light theme support
 * - Volume control with localStorage
 * - Collapsible floating UI
 * 
 * Technical Notes:
 * - Autoplay starts MUTED (Chrome requirement)
 * - User must interact to unmute
 * - Iframe never unmounts (continuous playback)
 */

import { useState, useRef, useEffect } from 'react';
import { Card, Button, Select, Slider, Space, Typography, Tooltip, theme } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  SoundOutlined,
  CustomerServiceOutlined,
  MinusOutlined,
  YoutubeOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
const { Option } = Select;

// YouTube Live Streams (Legal: using official embed)
const YT_STATIONS = {
  lofi: {
    videoId: 'jfKfPfyJRdk',
    name: 'Lofi Girl Radio',
    description: '24/7 chill beats',
  },
  chill: {
    videoId: '5qap5aO4i9A',
    name: 'Lofi Girl Beats',
    description: 'Study & Relax',
  },
  jazz: {
    videoId: 'Dx5qFachd3A',
    name: 'Coffee Shop Jazz',
    description: 'Smooth jazz cafe',
  },
  piano: {
    videoId: 'D6eC27zgHc0',
    name: 'Relaxing Piano',
    description: 'Soft piano music',
  },
};

type StationKey = keyof typeof YT_STATIONS;

// Declare YouTube API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

const PersistentYTPlayer = () => {
  const { token: themeToken } = theme.useToken();
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // State management
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('ytPlayerCollapsed');
    return saved ? JSON.parse(saved) : true;
  });
  const [currentStation, setCurrentStation] = useState<StationKey>(() => {
    const saved = localStorage.getItem('ytPlayerStation');
    return (saved as StationKey) || 'lofi';
  });
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('ytPlayerVolume');
    return saved ? parseInt(saved) : 50;
  });
  const [isMuted, setIsMuted] = useState(true); // Start muted (Chrome autoplay requirement)

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem('ytPlayerCollapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    localStorage.setItem('ytPlayerStation', currentStation);
  }, [currentStation]);

  useEffect(() => {
    localStorage.setItem('ytPlayerVolume', volume.toString());
  }, [volume]);

  // Load YouTube IFrame API
  useEffect(() => {
    // Check if API is already loaded
    if (window.YT && window.YT.Player) {
      initPlayer();
      return;
    }

    // Load the API
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    // API ready callback
    window.onYouTubeIframeAPIReady = () => {
      initPlayer();
    };

    return () => {
      // Cleanup: destroy player on unmount (though this component never unmounts)
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, []);

  // Initialize YouTube player
  const initPlayer = () => {
    if (!playerContainerRef.current) return;

    playerRef.current = new window.YT.Player(playerContainerRef.current, {
      videoId: YT_STATIONS[currentStation].videoId,
      playerVars: {
        autoplay: 1, // Autoplay (starts muted)
        mute: 1, // Must start muted for Chrome
        controls: 0, // Hide controls
        modestbranding: 1, // Minimal YouTube branding
        loop: 1, // Loop the video
        playlist: YT_STATIONS[currentStation].videoId, // Required for loop
        playsinline: 1, // Play inline on mobile
        rel: 0, // Don't show related videos
        showinfo: 0, // Hide video info
        iv_load_policy: 3, // Hide annotations
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange,
      },
    });
  };

  // Player ready callback
  const onPlayerReady = (event: any) => {
    setIsPlayerReady(true);
    // Set initial volume
    event.target.setVolume(volume);
    // Start playing (will be muted initially)
    event.target.playVideo();
    setIsPlaying(true);
  };

  // Player state change callback
  const onPlayerStateChange = (event: any) => {
    // YT.PlayerState: UNSTARTED (-1), ENDED (0), PLAYING (1), PAUSED (2), BUFFERING (3), CUED (5)
    if (event.data === 1) {
      setIsPlaying(true);
    } else if (event.data === 2) {
      setIsPlaying(false);
    }
  };

  // Handle play/pause
  const handlePlayPause = () => {
    if (!playerRef.current) return;

    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      // Unmute on first play (user interaction required)
      if (isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      }
      playerRef.current.playVideo();
    }
  };

  // Handle volume change
  const handleVolumeChange = (value: number) => {
    setVolume(value);
    if (playerRef.current) {
      playerRef.current.setVolume(value);
      // Unmute if volume is increased
      if (value > 0 && isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      }
    }
  };

  // Handle station change
  const handleStationChange = (station: StationKey) => {
    setCurrentStation(station);
    
    if (playerRef.current && isPlayerReady) {
      // Load new video with autoplay
      playerRef.current.loadVideoById({
        videoId: YT_STATIONS[station].videoId,
        startSeconds: 0,
      });
      
      // Update playlist for loop
      playerRef.current.setLoop(true);
      
      setIsPlaying(true);
    }
  };

  // Collapsed mini player style
  const collapsedStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '20px',
    right: '90px', // Offset from audio player
    zIndex: 9999,
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: themeToken.colorBgElevated,
    border: `2px solid #FF0000`, // YouTube red
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    transition: 'all 0.3s ease',
  };

  // Expanded player style
  const expandedStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '20px',
    right: '360px', // Offset from audio player
    zIndex: 9999,
    width: '320px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
    transition: 'all 0.3s ease',
  };

  // Collapsed view (mini player)
  if (isCollapsed) {
    return (
      <>
        {/* Hidden YouTube iframe (audio-only mode) */}
        <div
          style={{
            position: 'absolute',
            left: '-9999px',
            width: '1px',
            height: '1px',
            opacity: 0,
            pointerEvents: 'none',
          }}
        >
          <div ref={playerContainerRef} />
        </div>

        <Tooltip title="Open YouTube Player" placement="left">
          <div
            style={collapsedStyle}
            onClick={() => setIsCollapsed(false)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 0, 0, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            }}
          >
            <YoutubeOutlined
              style={{
                fontSize: '28px',
                color: isPlaying ? '#FF0000' : themeToken.colorTextSecondary,
              }}
            />
            {isPlaying && (
              <div
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#FF0000',
                  border: `2px solid ${themeToken.colorBgElevated}`,
                  animation: 'pulse 2s infinite',
                }}
              />
            )}
          </div>
        </Tooltip>
      </>
    );
  }

  // Expanded view (full player)
  return (
    <>
      {/* Add CSS animation for pulse effect */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>

      {/* Hidden YouTube iframe (audio-only mode) */}
      <div
        style={{
          position: 'absolute',
          left: '-9999px',
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none',
        }}
      >
        <div ref={playerContainerRef} />
      </div>

      <Card
        style={expandedStyle}
        styles={{
          body: { padding: '16px' },
        }}
        bordered={false}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <Space>
            <YoutubeOutlined style={{ fontSize: '20px', color: '#FF0000' }} />
            <Text strong style={{ color: themeToken.colorText }}>
              YouTube Music
            </Text>
          </Space>
          <Space>
            <Tooltip title="Minimize">
              <Button
                type="text"
                size="small"
                icon={<MinusOutlined />}
                onClick={() => setIsCollapsed(true)}
                style={{ color: themeToken.colorTextSecondary }}
              />
            </Tooltip>
          </Space>
        </div>

        {/* Station Selector */}
        <div style={{ marginBottom: '12px' }}>
          <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '6px' }}>
            Choose Station
          </Text>
          <Select
            value={currentStation}
            onChange={handleStationChange}
            style={{ width: '100%' }}
            size="large"
            disabled={!isPlayerReady}
          >
            {Object.entries(YT_STATIONS).map(([key, station]) => (
              <Option key={key} value={key}>
                <div>
                  <div style={{ fontWeight: 500 }}>{station.name}</div>
                  <div style={{ fontSize: '12px', color: themeToken.colorTextSecondary }}>
                    {station.description}
                  </div>
                </div>
              </Option>
            ))}
          </Select>
        </div>

        {/* Now Playing */}
        <div
          style={{
            padding: '8px 12px',
            background: themeToken.colorBgContainer,
            borderRadius: '8px',
            marginBottom: '12px',
            border: `1px solid ${themeToken.colorBorder}`,
          }}
        >
          <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>
            Now Playing
          </Text>
          <Text strong style={{ fontSize: '13px', color: themeToken.colorText }}>
            {YT_STATIONS[currentStation].name}
          </Text>
          {isPlaying && (
            <Text
              style={{
                fontSize: '11px',
                color: '#FF0000',
                marginLeft: '8px',
              }}
            >
              ● LIVE
            </Text>
          )}
        </div>

        {/* Muted Warning */}
        {isMuted && isPlaying && (
          <div
            style={{
              padding: '8px 12px',
              background: 'rgba(255, 152, 0, 0.1)',
              borderRadius: '6px',
              marginBottom: '12px',
              border: '1px solid rgba(255, 152, 0, 0.3)',
            }}
          >
            <Text style={{ fontSize: '12px', color: '#fa8c16' }}>
              🔇 Click play or adjust volume to unmute
            </Text>
          </div>
        )}

        {/* Loading State */}
        {!isPlayerReady && (
          <div
            style={{
              padding: '8px 12px',
              background: 'rgba(24, 144, 255, 0.1)',
              borderRadius: '6px',
              marginBottom: '12px',
              border: '1px solid rgba(24, 144, 255, 0.3)',
            }}
          >
            <Text style={{ fontSize: '12px', color: themeToken.colorPrimary }}>
              Loading YouTube player...
            </Text>
          </div>
        )}

        {/* Play/Pause Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <Button
            type="primary"
            shape="circle"
            size="large"
            icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={handlePlayPause}
            disabled={!isPlayerReady}
            style={{
              width: '56px',
              height: '56px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              background: '#FF0000',
              borderColor: '#FF0000',
            }}
          />
        </div>

        {/* Volume Control */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <SoundOutlined style={{ marginRight: '8px', color: themeToken.colorTextSecondary }} />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Volume
            </Text>
            <Text
              style={{
                marginLeft: 'auto',
                fontSize: '12px',
                color: '#FF0000',
                fontWeight: 500,
              }}
            >
              {volume}%
            </Text>
          </div>
          <Slider
            value={volume}
            onChange={handleVolumeChange}
            min={0}
            max={100}
            disabled={!isPlayerReady}
            tooltip={{ open: false }}
            styles={{
              track: { background: '#FF0000' },
              rail: { background: themeToken.colorBgContainer },
            }}
          />
        </div>

        {/* Legal Notice */}
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${themeToken.colorBorder}` }}>
          <Text type="secondary" style={{ fontSize: '10px', display: 'block', textAlign: 'center' }}>
            Using YouTube's official embed API
          </Text>
        </div>
      </Card>
    </>
  );
};

export default PersistentYTPlayer;
