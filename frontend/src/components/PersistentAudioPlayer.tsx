/**
 * PersistentAudioPlayer - Floating Online Radio Player
 * 
 * This component provides a non-intrusive radio player that stays mounted
 * at the root level and continues playing across all ERP pages.
 * 
 * Features:
 * - Persistent playback (never unmounts)
 * - Multiple radio stations (lofi, jazz, ambient, chill)
 * - Dark/Light theme support
 * - Collapsible floating UI
 * - Volume control with localStorage persistence
 * - Error handling for stream failures
 */

import { useState, useRef, useEffect } from 'react';
import { Card, Button, Select, Slider, Space, Typography, Tooltip, theme } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  SoundOutlined,
  CustomerServiceOutlined,
  MinusOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
const { Option } = Select;

// HTTPS-only radio stations (verified working streams with CORS support)
const STATIONS = {
  lofi: {
    url: 'https://streams.ilovemusic.de/iloveradio17.mp3',
    name: 'Lofi Chill',
    description: 'Relaxing lofi beats',
  },
  jazz: {
    url: 'https://ais-edge09-live365-dal02.cdnstream.com/a47039',
    name: 'Jazz Groove',
    description: 'Smooth jazz 24/7',
  },
  ambient: {
    url: 'https://stream.0nlineradio.com/chillout',
    name: 'Ambient Chillout',
    description: 'Relaxing ambient music',
  },
  chill: {
    url: 'https://streams.ilovemusic.de/iloveradio16.mp3',
    name: 'Chill Vibes',
    description: 'Peaceful background music',
  },
};

type StationKey = keyof typeof STATIONS;

const PersistentAudioPlayer = () => {
  const { token: themeToken } = theme.useToken();
  const audioRef = useRef<HTMLAudioElement>(null);

  // State management
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('audioPlayerCollapsed');
    return saved ? JSON.parse(saved) : true;
  });
  const [currentStation, setCurrentStation] = useState<StationKey>(() => {
    const saved = localStorage.getItem('audioPlayerStation');
    return (saved as StationKey) || 'lofi';
  });
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('audioPlayerVolume');
    return saved ? parseInt(saved) : 50;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem('audioPlayerCollapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    localStorage.setItem('audioPlayerStation', currentStation);
  }, [currentStation]);

  useEffect(() => {
    localStorage.setItem('audioPlayerVolume', volume.toString());
  }, [volume]);

  // Update audio volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Handle play with smooth fade-in
  const handlePlay = async () => {
    if (!audioRef.current) return;

    try {
      setIsLoading(true);
      setHasError(false);
      setErrorMessage('');

      // Reset and load new source
      audioRef.current.load();
      
      // Attempt to play
      await audioRef.current.play();
      
      setIsPlaying(true);
      setIsLoading(false);
    } catch (error: any) {
      console.error('Audio playback failed:', error);
      
      let message = 'Stream temporarily unavailable.';
      if (error.name === 'NotSupportedError') {
        message = 'This station format is not supported. Try another station.';
      } else if (error.name === 'NotAllowedError') {
        message = 'Browser blocked autoplay. Click play again.';
      } else if (error.name === 'AbortError') {
        message = 'Playback was interrupted. Please try again.';
      }
      
      setErrorMessage(message);
      setHasError(true);
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  // Handle pause
  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Handle station change
  const handleStationChange = (station: StationKey) => {
    const wasPlaying = isPlaying;
    
    // Pause current playback
    if (audioRef.current) {
      audioRef.current.pause();
    }

    setCurrentStation(station);
    setIsPlaying(false);
    setHasError(false);
    setErrorMessage('');

    // Auto-resume if was playing
    if (wasPlaying) {
      setTimeout(() => {
        handlePlay();
      }, 100);
    }
  };

  // Handle audio events
  const handleAudioError = (e: any) => {
    console.error('Audio error event:', e);
    
    let message = 'Stream connection failed. Try another station.';
    if (audioRef.current?.error) {
      switch (audioRef.current.error.code) {
        case 1: // MEDIA_ERR_ABORTED
          message = 'Playback aborted. Please try again.';
          break;
        case 2: // MEDIA_ERR_NETWORK
          message = 'Network error. Check your internet connection.';
          break;
        case 3: // MEDIA_ERR_DECODE
          message = 'Stream format error. Try another station.';
          break;
        case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
          message = 'Station unavailable. Please select another.';
          break;
      }
    }
    
    setErrorMessage(message);
    setHasError(true);
    setIsPlaying(false);
    setIsLoading(false);
  };

  const handleAudioCanPlay = () => {
    setIsLoading(false);
  };

  // Collapsed mini player style
  const collapsedStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: 9999,
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: themeToken.colorBgElevated,
    border: `2px solid ${themeToken.colorPrimary}`,
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
    right: '20px',
    zIndex: 9999,
    width: '320px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
    transition: 'all 0.3s ease',
  };

  return (
    <>
      {/* Hidden Audio Element - always mounted regardless of collapsed state */}
      <audio
        ref={audioRef}
        src={STATIONS[currentStation].url}
        preload="none"
        crossOrigin="anonymous"
        onError={handleAudioError}
        onCanPlay={handleAudioCanPlay}
        style={{ display: 'none' }}
      />

      {/* Collapsed view (mini player) */}
      {isCollapsed ? (
        <Tooltip title="Open Radio Player" placement="left">
          <div
            style={collapsedStyle}
            onClick={() => setIsCollapsed(false)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            }}
          >
            <CustomerServiceOutlined
              style={{
                fontSize: '28px',
                color: isPlaying ? themeToken.colorPrimary : themeToken.colorTextSecondary,
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
                  background: '#52c41a',
                  border: `2px solid ${themeToken.colorBgElevated}`,
                  animation: 'pulse 2s infinite',
                }}
              />
            )}
          </div>
        </Tooltip>
      ) : (
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
            <CustomerServiceOutlined style={{ fontSize: '20px', color: themeToken.colorPrimary }} />
            <Text strong style={{ color: themeToken.colorText }}>
              Radio Player
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
            popupMatchSelectWidth={true}
          >
            {Object.entries(STATIONS).map(([key, station]) => (
              <Option key={key} value={key} title={station.description}>
                {station.name}
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
            {STATIONS[currentStation].name}
          </Text>
          {isPlaying && (
            <Text
              style={{
                fontSize: '11px',
                color: '#52c41a',
                marginLeft: '8px',
              }}
            >
              ● LIVE
            </Text>
          )}
        </div>

        {/* Error Message */}
        {hasError && (
          <div
            style={{
              padding: '8px 12px',
              background: 'rgba(255, 77, 79, 0.1)',
              borderRadius: '6px',
              marginBottom: '12px',
              border: '1px solid rgba(255, 77, 79, 0.3)',
            }}
          >
            <Text type="danger" style={{ fontSize: '12px', lineHeight: '1.5' }}>
              {errorMessage || 'Stream unavailable. Try another station.'}
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
            onClick={isPlaying ? handlePause : handlePlay}
            loading={isLoading}
            disabled={hasError}
            style={{
              width: '56px',
              height: '56px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
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
                color: themeToken.colorPrimary,
                fontWeight: 500,
              }}
            >
              {volume}%
            </Text>
          </div>
          <Slider
            value={volume}
            onChange={setVolume}
            min={0}
            max={100}
            tooltip={{ open: false }}
            trackStyle={{ background: themeToken.colorPrimary }}
            handleStyle={{ borderColor: themeToken.colorPrimary }}
          />
        </div>
          </Card>
        </>
      )}
    </>
  );
};

export default PersistentAudioPlayer;
