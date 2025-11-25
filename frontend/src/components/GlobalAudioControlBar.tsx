/**
 * GlobalAudioControlBar - Floating Audio Control Panel
 * 
 * A persistent, collapsible audio control bar visible on every page.
 * Controls the YouTube audio player via AudioControlContext.
 * 
 * Features:
 * - Always visible (floating bottom-left)
 * - Play/Pause toggle
 * - Volume slider (0-100)
 * - Mute/Unmute toggle
 * - Collapse/Expand toggle
 * - Dark/Light theme compatible
 * - Smooth animations
 * - Professional design with Ant Design
 */

import { useState } from 'react';
import { Card, Button, Slider, Space, Typography, Tooltip, theme } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  SoundOutlined,
  MutedOutlined,
  UpOutlined,
  DownOutlined,
  CustomerServiceOutlined,
} from '@ant-design/icons';
import { useAudioControl } from '../context/AudioControlContext';
import { useTheme } from '../context/ThemeContext';

const { Text } = Typography;

export default function GlobalAudioControlBar() {
  const { token } = theme.useToken();
  const { mode } = useTheme();
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('audioControlCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const audio = useAudioControl();

  const handleToggleCollapse = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('audioControlCollapsed', JSON.stringify(newState));
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

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        zIndex: 9999,
        width: collapsed ? '200px' : '280px',
        transition: 'all 0.3s ease',
      }}
    >
      <Card
        bordered
        style={{
          borderRadius: '12px',
          backgroundColor: token.colorBgContainer,
          borderColor: token.colorBorder,
          boxShadow: mode === 'dark' 
            ? '0 8px 24px rgba(0, 0, 0, 0.5)'
            : '0 8px 24px rgba(0, 0, 0, 0.12)',
        }}
        bodyStyle={{ padding: '12px' }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: collapsed ? 0 : '12px',
          }}
        >
          <Space size={8}>
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

          <Tooltip title={collapsed ? 'Expand' : 'Collapse'}>
            <Button
              type="text"
              size="small"
              icon={collapsed ? <UpOutlined /> : <DownOutlined />}
              onClick={handleToggleCollapse}
              style={{
                color: token.colorTextSecondary,
              }}
            />
          </Tooltip>
        </div>

        {/* Controls - hidden when collapsed */}
        {!collapsed && (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {/* Play/Pause and Mute */}
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
                  }}
                />
              </Tooltip>

              <div style={{ flex: 1, marginLeft: '12px', marginRight: '12px' }}>
                <Slider
                  min={0}
                  max={100}
                  value={audio.isMuted ? 0 : audio.volume}
                  onChange={handleVolumeChange}
                  disabled={!audio.isReady}
                  tooltip={{ formatter: (value) => `${value}%` }}
                  style={{ margin: 0 }}
                />
              </div>

              <Tooltip title={audio.isMuted ? 'Unmute' : 'Mute'}>
                <Button
                  type="text"
                  shape="circle"
                  icon={audio.isMuted ? <MutedOutlined /> : <SoundOutlined />}
                  onClick={handleToggleMute}
                  disabled={!audio.isReady}
                  style={{
                    color: audio.isMuted ? token.colorTextSecondary : token.colorPrimary,
                  }}
                />
              </Tooltip>
            </div>

            {/* Status Text */}
            <div
              style={{
                textAlign: 'center',
                paddingTop: '4px',
              }}
            >
              <Text
                type="secondary"
                style={{
                  fontSize: '12px',
                  color: token.colorTextTertiary,
                }}
              >
                {!audio.isReady
                  ? 'Loading...'
                  : audio.isPlaying
                  ? '♫ Playing'
                  : 'Paused'}
              </Text>
            </div>
          </Space>
        )}
      </Card>
    </div>
  );
}
