/**
 * HeaderAudioPlayer - Draggable Header-Based Audio Control
 * 
 * A compact, collapsible audio player that sits in the header area.
 * Features drag-and-drop repositioning and localStorage persistence.
 * 
 * Features:
 * - Collapse to icon (🎧) or expand to full control panel
 * - Drag-and-drop repositioning (expanded mode only)
 * - Play/Pause, Volume slider, Mute toggle
 * - Saves position, collapsed state, and volume to localStorage
 * - Dark/Light theme compatible
 * - Smooth animations
 * - Professional Ant Design styling
 */

import { useState, useRef, useEffect } from 'react';
import { Card, Button, Slider, Space, Typography, Tooltip, theme } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  SoundOutlined,
  MutedOutlined,
  CloseOutlined,
  CustomerServiceOutlined,
  DragOutlined,
} from '@ant-design/icons';
import { useAudioControl } from '../context/AudioControlContext';
import { useTheme } from '../context/ThemeContext';

const { Text } = Typography;

interface Position {
  x: number;
  y: number;
}

const STORAGE_KEYS = {
  COLLAPSED: 'headerAudioPlayer.collapsed',
  POSITION: 'headerAudioPlayer.position',
};

export default function HeaderAudioPlayer() {
  const { token } = theme.useToken();
  const { mode } = useTheme();
  const audio = useAudioControl();

  // Load saved state from localStorage
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.COLLAPSED);
    return saved ? JSON.parse(saved) : true; // Default to collapsed
  });

  const [position, setPosition] = useState<Position>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.POSITION);
    return saved ? JSON.parse(saved) : { x: 0, y: 0 };
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // Save collapsed state
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COLLAPSED, JSON.stringify(collapsed));
  }, [collapsed]);

  // Save position
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.POSITION, JSON.stringify(position));
  }, [position]);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!panelRef.current || collapsed) return;

    const rect = panelRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    // Keep panel within viewport bounds
    const maxX = window.innerWidth - (panelRef.current?.offsetWidth || 280);
    const maxY = window.innerHeight - (panelRef.current?.offsetHeight || 200);

    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add/remove global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleToggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  const handleVolumeChange = (value: number) => {
    audio.setVolume(value);
    if (value === 0) {
      audio.mute();
    } else if (audio.isMuted) {
      audio.unMute();
    }
  };

  const handleToggleMute = () => {
    if (audio.isMuted) {
      audio.unMute();
      if (audio.volume === 0) {
        audio.setVolume(60);
      }
    } else {
      audio.mute();
    }
  };

  const handlePlayPause = () => {
    if (audio.isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  // Collapsed icon button view
  if (collapsed) {
    return (
      <Tooltip title="Background Music">
        <Button
          type="text"
          shape="circle"
          size="large"
          icon={<CustomerServiceOutlined />}
          onClick={handleToggleCollapse}
          style={{
            color: audio.isPlaying ? token.colorPrimary : token.colorTextSecondary,
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
          }}
        />
      </Tooltip>
    );
  }

  // Expanded draggable panel view
  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 10000,
        cursor: isDragging ? 'grabbing' : 'default',
        userSelect: 'none',
        transition: isDragging ? 'none' : 'all 0.3s ease',
      }}
    >
      <Card
        variant="outlined"
        style={{
          width: '280px',
          borderRadius: '12px',
          backgroundColor: token.colorBgElevated,
          borderColor: token.colorBorder,
          boxShadow: mode === 'dark'
            ? '0 8px 32px rgba(0, 0, 0, 0.6)'
            : '0 8px 32px rgba(0, 0, 0, 0.15)',
        }}
        bodyStyle={{ padding: '16px' }}
      >
        {/* Draggable Header */}
        <div
          onMouseDown={handleMouseDown}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            cursor: 'grab',
            paddingBottom: '12px',
            borderBottom: `1px solid ${token.colorBorder}`,
          }}
        >
          <Space size={8}>
            <DragOutlined
              style={{
                fontSize: '16px',
                color: token.colorTextTertiary,
              }}
            />
            <CustomerServiceOutlined
              style={{
                fontSize: '18px',
                color: token.colorPrimary,
              }}
            />
            <Text
              strong
              style={{
                fontSize: '14px',
                color: token.colorText,
              }}
            >
              {audio.title}
            </Text>
          </Space>

          <Tooltip title="Collapse">
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={handleToggleCollapse}
              style={{
                color: token.colorTextSecondary,
              }}
            />
          </Tooltip>
        </div>

        {/* Controls */}
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {/* Play/Pause and Status */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Tooltip title={audio.isPlaying ? 'Pause' : 'Play'}>
              <Button
                type="primary"
                shape="circle"
                size="large"
                icon={audio.isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={handlePlayPause}
                disabled={!audio.isReady}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                }}
              />
            </Tooltip>

            <Text
              type="secondary"
              style={{
                fontSize: '13px',
                color: token.colorTextSecondary,
              }}
            >
              {!audio.isReady ? 'Loading...' : audio.isPlaying ? '♫ Playing' : 'Paused'}
            </Text>
          </div>

          {/* Volume Control */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <Text
                style={{
                  fontSize: '12px',
                  color: token.colorTextTertiary,
                }}
              >
                Volume
              </Text>
              <Text
                style={{
                  fontSize: '12px',
                  color: token.colorText,
                  fontWeight: 500,
                }}
              >
                {audio.isMuted ? 0 : audio.volume}%
              </Text>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Tooltip title={audio.isMuted ? 'Unmute' : 'Mute'}>
                <Button
                  type="text"
                  shape="circle"
                  size="small"
                  icon={audio.isMuted ? <MutedOutlined /> : <SoundOutlined />}
                  onClick={handleToggleMute}
                  disabled={!audio.isReady}
                  style={{
                    color: audio.isMuted ? token.colorTextSecondary : token.colorPrimary,
                  }}
                />
              </Tooltip>

              <Slider
                min={0}
                max={100}
                value={audio.isMuted ? 0 : audio.volume}
                onChange={handleVolumeChange}
                disabled={!audio.isReady}
                style={{ flex: 1, margin: 0 }}
              />
            </div>
          </div>

          {/* Equalizer Animation (when playing) */}
          {audio.isPlaying && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                gap: '3px',
                height: '24px',
                padding: '4px 0',
              }}
            >
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  style={{
                    width: '4px',
                    backgroundColor: token.colorPrimary,
                    borderRadius: '2px',
                    animation: `equalizerBounce ${0.5 + i * 0.1}s ease-in-out infinite alternate`,
                    height: `${30 + i * 10}%`,
                  }}
                />
              ))}
            </div>
          )}
        </Space>
      </Card>

      {/* CSS Animation for Equalizer */}
      <style>{`
        @keyframes equalizerBounce {
          0% { height: 20%; }
          100% { height: 80%; }
        }
      `}</style>
    </div>
  );
}
