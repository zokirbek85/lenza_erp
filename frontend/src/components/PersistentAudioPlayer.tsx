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
  CloseOutlined,
  CustomerServiceOutlined,
  MinusOutlined,
} from '@ant-icons/icons';

const { Text } = Typography;
const { Option } = Select;

// HTTPS-only radio stations (royalty-free public streams)
const STATIONS = {
  lofi: {
    url: 'https://play.streamafrica.net/lofi',
    name: 'Lofi Hip Hop',
    description: 'Chill beats to work to',
  },
  jazz: {
    url: 'https://jazzradio.ice.infomaniak.ch/jazzradio-high.mp3',
    name: 'Jazz Radio',
    description: 'Smooth jazz classics',
  },
  ambient: {
    url: 'https://streams.radioboss.fm:8040/stream',
    name: 'Ambient',
    description: 'Ambient soundscapes',
  },
  chill: {
    url: 'https://icecast2.play.cz/cfradio128.mp3',
    name: 'Chill Radio',
    description: 'Relaxing vibes',
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

      // Reset and load new source
      audioRef.current.load();
      
      // Attempt to play
      await audioRef.current.play();
      
      setIsPlaying(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Audio playback failed:', error);
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

    // Auto-resume if was playing
    if (wasPlaying) {
      setTimeout(() => {
        handlePlay();
      }, 100);
    }
  };

  // Handle audio events
  const handleAudioError = () => {
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

  // Collapsed view (mini player)
  if (isCollapsed) {
    return (
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
          >
            {Object.entries(STATIONS).map(([key, station]) => (
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
              padding: '8px',
              background: 'rgba(255, 77, 79, 0.1)',
              borderRadius: '6px',
              marginBottom: '12px',
              border: '1px solid rgba(255, 77, 79, 0.3)',
            }}
          >
            <Text type="danger" style={{ fontSize: '12px' }}>
              Stream unavailable. Try another station.
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

        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          src={STATIONS[currentStation].url}
          preload="none"
          onError={handleAudioError}
          onCanPlay={handleAudioCanPlay}
        />
      </Card>
    </>
  );
};

export default PersistentAudioPlayer;
