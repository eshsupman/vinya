import { useState } from 'react';
import { useMedia } from '../hooks/useMedia.js';
import { useSignaling } from '../hooks/useSignaling.js';
import { useWebRTC } from '../hooks/useWebRTC.js';
import { useAbr } from '../hooks/useAbr.js';
import VideoTile from './VideoTile.jsx';
import ControlBar from './ControlBar.jsx';
import ChannelIndicator from './ChannelIndicator.jsx';

export default function CallRoom({ roomId, onLeave }) {
  const { localStream, error, micOn, camOn, toggleMic, toggleCam } = useMedia();
  const { signaling } = useSignaling(roomId);
  const { pc, videoSender, remoteStream, connectionState } = useWebRTC({
    signaling,
    localStream,
  });
  const abr = useAbr({
    pcRef: pc,
    videoSenderRef: videoSender,
    enabled: connectionState === 'connected',
  });

  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
    }
  };

  const hangup = () => {
    signaling?.close();
    onLeave();
  };

  if (error) {
    return (
      <div className="error-screen">
        Не удалось получить доступ к камере или микрофону:{' '}
        {String(error.name || error)}
      </div>
    );
  }

  const connected = connectionState === 'connected' && remoteStream;

  return (
    <div className="call-room">
      <VideoTile
        className="remote"
        stream={remoteStream}
        label={connected ? null : 'Ожидание собеседника…'}
      />
      <VideoTile className="local-pip" stream={localStream} muted mirrored label="Вы" />

      <div className="top-bar">
        <ChannelIndicator
          state={abr.state}
          decision={abr.decision}
          bitrateMbps={abr.bitrateMbps}
        />
        {!connected && (
          <button type="button" className="copy-link" onClick={copyLink}>
            {copied ? 'Ссылка скопирована' : 'Скопировать ссылку-приглашение'}
          </button>
        )}
      </div>

      <ControlBar
        micOn={micOn}
        camOn={camOn}
        onToggleMic={toggleMic}
        onToggleCam={toggleCam}
        onHangup={hangup}
      />
    </div>
  );
}
